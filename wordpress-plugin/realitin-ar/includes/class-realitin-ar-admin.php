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
		wp_enqueue_script(
			'realitin-ar-admin',
			REALITIN_AR_URL . 'assets/js/admin.js',
			array( 'jquery' ),
			REALITIN_AR_VERSION,
			true
		);
		wp_localize_script(
			'realitin-ar-admin',
			'realitinArAdmin',
			array(
				'mime'   => Realitin_AR_Model_Files::MIME,
				'title'  => __( 'Select 3D model (GLB)', 'realitin-ar' ),
				'button' => __( 'Use this model', 'realitin-ar' ),
				'change' => __( 'Change model', 'realitin-ar' ),
				'select' => __( 'Select GLB model', 'realitin-ar' ),
			)
		);
	}
}
