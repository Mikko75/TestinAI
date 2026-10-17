<?php
/**
 * Connection to the Realitin service, which generates 3D models from product images.
 *
 * The URL and API key come from wp-config.php constants (REALITIN_AR_SERVICE_URL, REALITIN_AR_API_KEY)
 * or from Settings → Realitin AR. The API key is only used server-side.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Service {

	const OPTION_URL = 'realitin_ar_service_url';
	const OPTION_KEY = 'realitin_ar_api_key';

	public static function url() {
		$url = defined( 'REALITIN_AR_SERVICE_URL' ) ? REALITIN_AR_SERVICE_URL : get_option( self::OPTION_URL, '' );
		return untrailingslashit( (string) $url );
	}

	public static function api_key() {
		return (string) ( defined( 'REALITIN_AR_API_KEY' ) ? REALITIN_AR_API_KEY : get_option( self::OPTION_KEY, '' ) );
	}

	public static function is_configured() {
		return '' !== self::url() && '' !== self::api_key();
	}

	/**
	 * @param string     $method HTTP method.
	 * @param string     $path   Path such as /v1/jobs.
	 * @param array|null $body   JSON body.
	 * @return array|WP_Error Decoded JSON response.
	 */
	public static function request( $method, $path, $body = null ) {
		$args = array(
			'method'  => $method,
			'timeout' => 60,
			'headers' => array(
				'Authorization' => 'Bearer ' . self::api_key(),
				'Accept'        => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['headers']['Content-Type'] = 'application/json';
			$args['body']                    = wp_json_encode( $body );
		}
		$response = wp_remote_request( self::url() . $path, $args );
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$status = wp_remote_retrieve_response_code( $response );
		$data   = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			return new WP_Error( 'realitin_ar_service', sprintf( 'Unexpected response from the Realitin service (HTTP %d).', $status ) );
		}
		if ( $status >= 400 ) {
			$message = isset( $data['error']['message'] ) ? (string) $data['error']['message'] : sprintf( 'HTTP %d', $status );
			$code    = isset( $data['error']['code'] ) ? (string) $data['error']['code'] : 'realitin_ar_service';
			return new WP_Error( 'realitin_ar_' . $code, $message, array( 'status' => $status ) );
		}
		return $data;
	}

	/**
	 * Downloads a generated model to a temporary file.
	 *
	 * @param string $url Model URL returned by the service.
	 * @return string|WP_Error Temporary file path.
	 */
	public static function download_model( $url ) {
		// Only download from the configured service.
		if ( 0 !== strpos( $url, self::url() . '/' ) ) {
			return new WP_Error( 'realitin_ar_service', 'The model URL does not belong to the Realitin service.' );
		}
		$tmp      = wp_tempnam( 'realitin-ar.glb' );
		$response = wp_remote_get(
			$url,
			array(
				'timeout'  => 120,
				'stream'   => true,
				'filename' => $tmp,
				'headers'  => array( 'Authorization' => 'Bearer ' . self::api_key() ),
			)
		);
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			wp_delete_file( $tmp );
			return is_wp_error( $response ) ? $response : new WP_Error( 'realitin_ar_service', 'The model could not be downloaded.' );
		}
		return $tmp;
	}
}
