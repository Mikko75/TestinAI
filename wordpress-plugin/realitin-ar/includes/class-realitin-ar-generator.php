<?php
/**
 * Generates a product's 3D model from its product image through the Realitin service.
 *
 * Flow: the admin clicks "Generate" → the product image and confirmed dimensions are sent to the
 * service → the browser polls the status through admin-ajax → when the model is ready it is
 * downloaded into the media library and set as the product's model.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Generator {

	const META_JOB        = '_realitin_ar_job';
	const META_DIMENSIONS = '_realitin_ar_dimensions';
	const NONCE_ACTION    = 'realitin_ar_generate';
	/** The service accepts up to 30 MB of JSON; base64 adds a third. */
	const MAX_IMAGE_BYTES = 15728640;

	public static function init() {
		add_action( 'wp_ajax_realitin_ar_generate', array( __CLASS__, 'ajax_generate' ) );
		add_action( 'wp_ajax_realitin_ar_job_status', array( __CLASS__, 'ajax_status' ) );
	}

	/**
	 * Dimensions to prefill: saved confirmed dimensions, otherwise WooCommerce's dimension fields.
	 * WooCommerce fields often hold the package size, so the admin must confirm them.
	 *
	 * @param WC_Product $product Product.
	 * @return array{width: float|string, height: float|string, depth: float|string}
	 */
	public static function prefill_dimensions( $product ) {
		$saved = get_post_meta( $product->get_id(), self::META_DIMENSIONS, true );
		if ( is_array( $saved ) && isset( $saved['width'], $saved['height'], $saved['depth'] ) ) {
			return $saved;
		}
		$to_cm = static function ( $value ) {
			if ( '' === $value || null === $value ) {
				return '';
			}
			$cm = wc_get_dimension( (float) $value, 'cm' );
			return $cm > 0 ? round( $cm, 1 ) : '';
		};
		// WooCommerce: length × width × height. For furniture: length = side to side, width = front to back.
		return array(
			'width'  => $to_cm( $product->get_length() ),
			'height' => $to_cm( $product->get_height() ),
			'depth'  => $to_cm( $product->get_width() ),
		);
	}

	/**
	 * Job state for the admin UI.
	 *
	 * @param int $product_id Product ID.
	 */
	public static function job_state( $product_id ) {
		$job = get_post_meta( $product_id, self::META_JOB, true );
		return is_array( $job ) ? $job : null;
	}

	/**
	 * @param string $message Error message.
	 * @param int    $status  HTTP status.
	 */
	private static function error( $message, $status = 400 ) {
		wp_send_json_error( array( 'message' => $message ), $status );
	}

	/**
	 * Common checks for both AJAX actions; returns the product.
	 */
	private static function product_from_request() {
		check_ajax_referer( self::NONCE_ACTION, 'nonce' );
		$product_id = isset( $_POST['product_id'] ) ? absint( wp_unslash( $_POST['product_id'] ) ) : 0;
		if ( ! $product_id || ! current_user_can( 'edit_product', $product_id ) ) {
			self::error( __( 'You are not allowed to edit this product.', 'realitin-ar' ), 403 );
		}
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			self::error( __( 'Product not found.', 'realitin-ar' ), 404 );
		}
		if ( ! Realitin_AR_Service::is_configured() ) {
			self::error( __( 'Connect the Realitin service first in Settings → Realitin AR.', 'realitin-ar' ) );
		}
		return $product;
	}

	public static function ajax_generate() {
		$product = self::product_from_request();

		$dimensions = array();
		foreach ( array( 'width', 'height', 'depth' ) as $axis ) {
			$value = isset( $_POST[ $axis ] ) ? (float) str_replace( ',', '.', sanitize_text_field( wp_unslash( $_POST[ $axis ] ) ) ) : 0;
			if ( $value <= 1 || $value >= 1000 ) {
				self::error( __( 'Enter the furniture’s width, height and depth in centimetres (1–1000).', 'realitin-ar' ) );
			}
			$dimensions[ $axis ] = round( $value, 1 );
		}

		$image_id = $product->get_image_id();
		$file     = $image_id ? get_attached_file( (int) $image_id ) : '';
		if ( ! $file || ! is_readable( $file ) ) {
			self::error( __( 'Add a product image first.', 'realitin-ar' ) );
		}
		if ( filesize( $file ) > self::MAX_IMAGE_BYTES ) {
			self::error( __( 'The product image is too large (maximum 15 MB).', 'realitin-ar' ) );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local media file.
		$image  = file_get_contents( $file );
		$result = Realitin_AR_Service::request(
			'POST',
			'/v1/jobs',
			array(
				// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- binary upload in JSON.
				'image'      => base64_encode( $image ),
				'name'       => $product->get_name(),
				'dimensions' => array(
					'widthCm'  => $dimensions['width'],
					'heightCm' => $dimensions['height'],
					'depthCm'  => $dimensions['depth'],
				),
			)
		);
		if ( is_wp_error( $result ) ) {
			self::error( self::service_error_message( $result ), 502 );
		}

		update_post_meta( $product->get_id(), self::META_DIMENSIONS, $dimensions );
		$job = array(
			'id'       => (string) $result['id'],
			'status'   => (string) $result['status'],
			'progress' => (int) $result['progress'],
			'warnings' => array(),
		);
		update_post_meta( $product->get_id(), self::META_JOB, $job );
		wp_send_json_success( $job );
	}

	public static function ajax_status() {
		$product = self::product_from_request();
		$job     = self::job_state( $product->get_id() );
		if ( ! $job ) {
			self::error( __( 'No generation in progress.', 'realitin-ar' ), 404 );
		}
		if ( in_array( $job['status'], array( 'imported', 'failed' ), true ) ) {
			wp_send_json_success( $job );
		}

		$remote = Realitin_AR_Service::request( 'GET', '/v1/jobs/' . rawurlencode( $job['id'] ) );
		if ( is_wp_error( $remote ) ) {
			// Temporary connection problems: keep polling.
			wp_send_json_success( $job );
		}

		$job['status']   = (string) $remote['status'];
		$job['progress'] = (int) $remote['progress'];
		$job['warnings'] = self::format_warnings( (array) ( $remote['warnings'] ?? array() ) );

		if ( 'failed' === $job['status'] ) {
			$job['error'] = isset( $remote['error']['code'] ) ? (string) $remote['error']['code'] : 'generation';
		}
		if ( 'done' === $job['status'] ) {
			// Overlapping status requests (e.g. two open tabs) must not import the model twice.
			$lock = 'realitin_ar_import_' . md5( $job['id'] );
			if ( get_transient( $lock ) ) {
				$job['status'] = 'processing';
				wp_send_json_success( $job );
			}
			set_transient( $lock, 1, 5 * MINUTE_IN_SECONDS );
			$attachment_id = self::import_model( $product, (string) $remote['modelUrl'] );
			delete_transient( $lock );
			if ( is_wp_error( $attachment_id ) ) {
				$job['status'] = 'failed';
				$job['error']  = 'import';
			} else {
				update_post_meta( $product->get_id(), REALITIN_AR_META_MODEL, $attachment_id );
				$job['status']        = 'imported';
				$job['attachment_id'] = $attachment_id;
				$job['file_name']     = wp_basename( (string) get_attached_file( $attachment_id ) );
				$job['dimensions']    = $remote['dimensions'];
			}
		}
		update_post_meta( $product->get_id(), self::META_JOB, $job );
		wp_send_json_success( $job );
	}

	/**
	 * Downloads the generated model into the media library.
	 *
	 * @param WC_Product $product   Product.
	 * @param string     $model_url Model URL from the service.
	 * @return int|WP_Error Attachment ID.
	 */
	private static function import_model( $product, $model_url ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = Realitin_AR_Service::download_model( $model_url );
		if ( is_wp_error( $tmp ) ) {
			return $tmp;
		}
		$file = array(
			'name'     => sanitize_file_name( $product->get_slug() . '-3d.glb' ),
			'tmp_name' => $tmp,
		);
		$attachment_id = media_handle_sideload( $file, $product->get_id(), $product->get_name() . ' – 3D' );
		if ( is_wp_error( $attachment_id ) ) {
			wp_delete_file( $tmp );
		}
		return $attachment_id;
	}

	/**
	 * Turns the service's warning codes into translated messages.
	 *
	 * @param array $warnings Warnings from the service.
	 * @return string[]
	 */
	private static function format_warnings( $warnings ) {
		$axes     = array(
			'width'  => _x( 'width', 'dimension in a sentence', 'realitin-ar' ),
			'height' => _x( 'height', 'dimension in a sentence', 'realitin-ar' ),
			'depth'  => _x( 'depth', 'dimension in a sentence', 'realitin-ar' ),
		);
		$messages = array();
		foreach ( $warnings as $warning ) {
			$code = is_array( $warning ) && isset( $warning['code'] ) ? $warning['code'] : '';
			if ( 'dimension_mismatch' === $code && isset( $axes[ $warning['axis'] ] ) ) {
				$messages[] = sprintf(
					/* translators: 1: dimension name, 2: model size in cm, 3: entered size in cm */
					__( 'The model’s %1$s is %2$s cm but you entered %3$s cm. The proportions of the generated model differ from the real furniture.', 'realitin-ar' ),
					$axes[ $warning['axis'] ],
					number_format_i18n( (float) $warning['modelCm'], 1 ),
					number_format_i18n( (float) $warning['expectedCm'], 1 )
				);
			} elseif ( 'estimated_size' === $code ) {
				$messages[] = __( 'No dimensions were given, so the size is estimated.', 'realitin-ar' );
			}
		}
		return $messages;
	}

	/**
	 * @param WP_Error $error Service error.
	 */
	private static function service_error_message( $error ) {
		if ( 'realitin_ar_invalid_image' === $error->get_error_code() ) {
			return __( 'The product image could not be used. Use a JPEG or PNG image of at least 256 × 256 pixels.', 'realitin-ar' );
		}
		if ( 'realitin_ar_unauthorized' === $error->get_error_code() ) {
			return __( 'The Realitin service rejected the API key. Check Settings → Realitin AR.', 'realitin-ar' );
		}
		return __( 'The Realitin service could not be reached. Try again later.', 'realitin-ar' );
	}
}
