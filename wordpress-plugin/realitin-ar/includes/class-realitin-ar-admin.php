<?php
/**
 * Product edit screen: choose the product's 3D model from the media library.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Admin {

	const NONCE = 'realitin_ar_model_nonce';

	public static function init() {
		add_action( 'add_meta_boxes_product', array( __CLASS__, 'add_meta_box' ) );
		add_action( 'save_post_product', array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	public static function add_meta_box() {
		add_meta_box(
			'realitin-ar-model',
			__( '3D model (Realitin AR)', 'realitin-ar' ),
			array( __CLASS__, 'render' ),
			'product',
			'side'
		);
	}

	/**
	 * @param WP_Post $post Product post.
	 */
	public static function render( $post ) {
		$attachment_id = (int) get_post_meta( $post->ID, REALITIN_AR_META_MODEL, true );
		$file_name     = $attachment_id ? wp_basename( (string) get_attached_file( $attachment_id ) ) : '';
		wp_nonce_field( 'realitin_ar_save_model', self::NONCE );
		?>
		<div class="realitin-ar-admin">
			<input type="hidden" name="realitin_ar_model_id" value="<?php echo esc_attr( $attachment_id ? (string) $attachment_id : '' ); ?>" data-realitin-ar-input />
			<p data-realitin-ar-file <?php echo $attachment_id ? '' : 'hidden'; ?>>
				<strong><?php esc_html_e( 'Model:', 'realitin-ar' ); ?></strong>
				<span data-realitin-ar-file-name><?php echo esc_html( $file_name ); ?></span>
			</p>
			<p data-realitin-ar-empty <?php echo $attachment_id ? 'hidden' : ''; ?>>
				<?php esc_html_e( 'No 3D model. Add a GLB file to show the product in 3D and AR.', 'realitin-ar' ); ?>
			</p>
			<p>
				<button type="button" class="button" data-realitin-ar-select>
					<?php echo $attachment_id ? esc_html__( 'Change model', 'realitin-ar' ) : esc_html__( 'Select GLB model', 'realitin-ar' ); ?>
				</button>
				<button type="button" class="button-link button-link-delete" data-realitin-ar-remove <?php echo $attachment_id ? '' : 'hidden'; ?>>
					<?php esc_html_e( 'Remove', 'realitin-ar' ); ?>
				</button>
			</p>
			<p class="description">
				<?php esc_html_e( 'The model is shown at its real size in AR. Check that the model is in metres and stands on the floor.', 'realitin-ar' ); ?>
			</p>
			<?php self::render_generator( $post ); ?>
		</div>
		<?php
	}

	/**
	 * "Generate from product image" section.
	 *
	 * @param WP_Post $post Product post.
	 */
	private static function render_generator( $post ) {
		$product = wc_get_product( $post->ID );
		if ( ! $product ) {
			return;
		}
		?>
		<hr />
		<div class="realitin-ar-generate" data-realitin-ar-generate>
			<p><strong><?php esc_html_e( 'Generate from product image', 'realitin-ar' ); ?></strong></p>
			<?php
			if ( ! Realitin_AR_Service::is_configured() ) {
				echo '<p>';
				printf(
					/* translators: %s: link to the settings page */
					esc_html__( 'Connect the Realitin service in %s to generate 3D models.', 'realitin-ar' ),
					'<a href="' . esc_url( admin_url( 'options-general.php?page=' . Realitin_AR_Settings::PAGE ) ) . '">' . esc_html__( 'Settings → Realitin AR', 'realitin-ar' ) . '</a>'
				);
				echo '</p></div>';
				return;
			}
			if ( ! $product->get_image_id() ) {
				echo '<p>' . esc_html__( 'Add a product image first. The 3D model is generated from it.', 'realitin-ar' ) . '</p></div>';
				return;
			}
			$dimensions = Realitin_AR_Generator::prefill_dimensions( $product );
			$fields     = array(
				'width'  => __( 'Width', 'realitin-ar' ),
				'height' => __( 'Height', 'realitin-ar' ),
				'depth'  => __( 'Depth', 'realitin-ar' ),
			);
			?>
			<p class="description"><?php esc_html_e( 'Furniture’s own dimensions in centimetres (not the package). The model is scaled to these.', 'realitin-ar' ); ?></p>
			<div class="realitin-ar-dimensions">
				<?php foreach ( $fields as $axis => $label ) : ?>
					<label>
						<span><?php echo esc_html( $label ); ?></span>
						<input type="number" min="1" max="999" step="0.1" inputmode="decimal" value="<?php echo esc_attr( (string) $dimensions[ $axis ] ); ?>" data-realitin-ar-dimension="<?php echo esc_attr( $axis ); ?>" />
					</label>
				<?php endforeach; ?>
			</div>
			<p>
				<button type="button" class="button button-primary" data-realitin-ar-generate-start>
					<?php esc_html_e( 'Generate 3D model', 'realitin-ar' ); ?>
				</button>
			</p>
			<div class="realitin-ar-generate__status" aria-live="polite" data-realitin-ar-generate-status></div>
		</div>
		<?php
	}

	/**
	 * @param int     $post_id Product ID.
	 * @param WP_Post $post    Product post.
	 */
	public static function save( $post_id, $post ) {
		if ( ! isset( $_POST[ self::NONCE ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE ] ) ), 'realitin_ar_save_model' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_product', $post_id ) || 'product' !== $post->post_type ) {
			return;
		}

		$attachment_id = isset( $_POST['realitin_ar_model_id'] ) ? absint( wp_unslash( $_POST['realitin_ar_model_id'] ) ) : 0;
		if ( $attachment_id && Realitin_AR_Model_Files::MIME === get_post_mime_type( $attachment_id ) ) {
			update_post_meta( $post_id, REALITIN_AR_META_MODEL, $attachment_id );
		} else {
			delete_post_meta( $post_id, REALITIN_AR_META_MODEL );
		}
	}

	/**
	 * @param string $hook Current admin page.
	 */
	public static function enqueue( $hook ) {
		$screen = get_current_screen();
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) || ! $screen || 'product' !== $screen->post_type ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_style( 'realitin-ar-admin', REALITIN_AR_URL . 'assets/css/admin.css', array(), REALITIN_AR_VERSION );
		wp_enqueue_script(
			'realitin-ar-admin',
			REALITIN_AR_URL . 'assets/js/admin.js',
			array( 'jquery' ),
			REALITIN_AR_VERSION,
			true
		);
		global $post;
		wp_localize_script(
			'realitin-ar-admin',
			'realitinArAdmin',
			array(
				'mime'      => Realitin_AR_Model_Files::MIME,
				'title'     => __( 'Select 3D model (GLB)', 'realitin-ar' ),
				'button'    => __( 'Use this model', 'realitin-ar' ),
				'change'    => __( 'Change model', 'realitin-ar' ),
				'select'    => __( 'Select GLB model', 'realitin-ar' ),
				'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
				'nonce'     => wp_create_nonce( Realitin_AR_Generator::NONCE_ACTION ),
				'productId' => $post ? (int) $post->ID : 0,
				'job'       => $post ? Realitin_AR_Generator::job_state( $post->ID ) : null,
				'status'    => array(
					'queued'     => __( 'Preparing the image…', 'realitin-ar' ),
					'uploading'  => __( 'Preparing the image…', 'realitin-ar' ),
					/* translators: %d: progress percentage */
					'generating' => __( 'Creating the 3D model… %d %%', 'realitin-ar' ),
					'done'       => __( 'Finishing the model…', 'realitin-ar' ),
					'processing' => __( 'Finishing the model…', 'realitin-ar' ),
					'imported'   => __( 'Model ready. It has been added to the product.', 'realitin-ar' ),
					'failed'     => __( 'Creating the model failed.', 'realitin-ar' ),
				),
				'errors'    => array(
					'quality'    => __( 'The generated model did not pass the automatic check. Try a different product image.', 'realitin-ar' ),
					'generation' => __( 'The 3D model could not be generated. Try again or use a different product image.', 'realitin-ar' ),
					'import'     => __( 'The model was generated but could not be added to the media library. Try again.', 'realitin-ar' ),
				),
				'warningsTitle' => __( 'Check the model:', 'realitin-ar' ),
				'requestFailed' => __( 'The request failed. Check your connection and try again.', 'realitin-ar' ),
				'generateAgain' => __( 'Generate again', 'realitin-ar' ),
			)
		);
	}
}
