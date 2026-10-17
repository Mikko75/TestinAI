<?php
/**
 * Product page: "View in your room" button and 3D / AR dialog.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Frontend {

	/** @var bool Whether the assets have been enqueued for this request. */
	private static $enqueued = false;

	public static function init() {
		/**
		 * Filters whether the button is added to product pages automatically.
		 * Return false and use the [realitin_ar] shortcode to place it manually.
		 */
		if ( apply_filters( 'realitin_ar_auto_insert', true ) ) {
			// After the add to cart form (priority 30) in the product summary.
			add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'render_current_product' ), 35 );
		}
		add_shortcode( 'realitin_ar', array( __CLASS__, 'shortcode' ) );
	}

	public static function render_current_product() {
		global $product;
		if ( $product instanceof WC_Product ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- markup is escaped in render().
			echo self::render( $product );
		}
	}

	/**
	 * [realitin_ar id="123"] – defaults to the current product.
	 *
	 * @param array $atts Shortcode attributes.
	 */
	public static function shortcode( $atts ) {
		$atts    = shortcode_atts( array( 'id' => 0 ), $atts, 'realitin_ar' );
		$product = wc_get_product( $atts['id'] ? absint( $atts['id'] ) : get_the_ID() );
		return $product ? self::render( $product ) : '';
	}

	/**
	 * @param WC_Product $product Product.
	 */
	public static function render( $product ) {
		$model_url = realitin_ar_get_model_url( $product->get_id() );
		if ( ! $model_url ) {
			return '';
		}
		self::enqueue();

		$title_id = wp_unique_id( 'realitin-ar-title-' );
		$help_id  = wp_unique_id( 'realitin-ar-help-' );
		/* translators: %s: product name */
		$alt = sprintf( __( '3D model of %s', 'realitin-ar' ), $product->get_name() );

		ob_start();
		?>
		<div class="realitin-ar" data-realitin-ar data-src="<?php echo esc_url( $model_url ); ?>" data-alt="<?php echo esc_attr( $alt ); ?>">
			<button type="button" class="button wp-element-button realitin-ar__open" data-realitin-ar-open>
				<svg class="realitin-ar__icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.8 8 12 11.7 5.2 8 12 4.3ZM5 9.7l6 3.3v6.6l-6-3.3V9.7Zm8 9.9V13l6-3.3v6.6l-6 3.3Z" fill="currentColor"/></svg>
				<?php esc_html_e( 'View in your room', 'realitin-ar' ); ?>
			</button>

			<dialog class="realitin-ar__dialog" aria-labelledby="<?php echo esc_attr( $title_id ); ?>">
				<div class="realitin-ar__header">
					<h2 class="realitin-ar__title" id="<?php echo esc_attr( $title_id ); ?>"><?php echo esc_html( $product->get_name() ); ?></h2>
					<button type="button" class="realitin-ar__close" data-realitin-ar-close aria-label="<?php esc_attr_e( 'Close', 'realitin-ar' ); ?>">&times;</button>
				</div>

				<div class="realitin-ar__stage" data-realitin-ar-stage>
					<div class="realitin-ar__overlay" role="status" data-realitin-ar-loading>
						<span><?php esc_html_e( 'Loading 3D model…', 'realitin-ar' ); ?></span>
						<span class="realitin-ar__bar" aria-hidden="true"><span data-realitin-ar-progress></span></span>
					</div>
					<div class="realitin-ar__overlay realitin-ar__overlay--error" role="alert" data-realitin-ar-error hidden>
						<p><?php esc_html_e( 'The 3D model could not be loaded. Check your connection and try again.', 'realitin-ar' ); ?></p>
						<button type="button" class="button wp-element-button" data-realitin-ar-retry><?php esc_html_e( 'Try again', 'realitin-ar' ); ?></button>
					</div>
				</div>

				<p class="realitin-ar__hint"><?php esc_html_e( 'Rotate and zoom to inspect the product.', 'realitin-ar' ); ?></p>
				<button type="button" class="button alt wp-element-button realitin-ar__start" data-realitin-ar-start disabled aria-describedby="<?php echo esc_attr( $help_id ); ?>">
					<?php esc_html_e( 'View in your room', 'realitin-ar' ); ?>
				</button>
				<p class="realitin-ar__help" id="<?php echo esc_attr( $help_id ); ?>" aria-live="polite" data-realitin-ar-help></p>
			</dialog>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	private static function enqueue() {
		if ( self::$enqueued ) {
			return;
		}
		self::$enqueued = true;

		wp_enqueue_style( 'realitin-ar', REALITIN_AR_URL . 'assets/css/realitin-ar.css', array(), REALITIN_AR_VERSION );
		wp_enqueue_script( 'realitin-ar', REALITIN_AR_URL . 'assets/js/realitin-ar.js', array(), REALITIN_AR_VERSION, true );
		wp_localize_script(
			'realitin-ar',
			'realitinAr',
			array(
				// Loaded only when the dialog is first opened (about 1 MB).
				'modelViewerUrl' => REALITIN_AR_URL . 'assets/vendor/model-viewer.min.js?ver=' . rawurlencode( REALITIN_AR_VERSION ),
				'messages'       => array(
					'checking'    => __( 'Checking whether your device supports AR…', 'realitin-ar' ),
					'available'   => __( 'Move your phone and place the furniture where you want it. It is shown at its real size.', 'realitin-ar' ),
					'unavailable' => __( 'You can view the furniture in 3D. Viewing it in your room requires a compatible phone and browser.', 'realitin-ar' ),
					'modelError'  => __( 'AR is available once the 3D model has loaded.', 'realitin-ar' ),
					'failed'      => __( 'The AR view could not be opened. You can keep viewing the furniture in 3D.', 'realitin-ar' ),
				),
			)
		);
	}
}
