<?php
/**
 * Allows GLB uploads to the media library.
 *
 * WordPress blocks unknown file types, and PHP's file type detection reports GLB as
 * application/octet-stream, so the file is accepted only when its header is a valid glTF binary.
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

class Realitin_AR_Model_Files {

	const MIME = 'model/gltf-binary';

	public static function init() {
		add_filter( 'upload_mimes', array( __CLASS__, 'add_mime' ) );
		add_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'check_glb' ), 10, 4 );
	}

	/**
	 * Adds GLB to the allowed upload types for users who can edit products.
	 *
	 * @param array $mimes Allowed mime types.
	 */
	public static function add_mime( $mimes ) {
		if ( current_user_can( 'edit_products' ) ) {
			$mimes['glb'] = self::MIME;
		}
		return $mimes;
	}

	/**
	 * Confirms that a .glb upload really is a glTF binary file.
	 *
	 * @param array  $data     File data: ext, type, proper_filename.
	 * @param string $file     Full path to the uploaded file.
	 * @param string $filename Original file name.
	 * @param array  $mimes    Allowed mime types.
	 */
	public static function check_glb( $data, $file, $filename, $mimes ) {
		if ( 'glb' !== strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) ) {
			return $data;
		}
		// WordPress passes null when the caller did not restrict the types.
		if ( null === $mimes ) {
			$mimes = get_allowed_mime_types();
		}
		if ( ! isset( $mimes['glb'] ) || ! self::is_glb( $file ) ) {
			return array(
				'ext'             => false,
				'type'            => false,
				'proper_filename' => false,
			);
		}
		return array(
			'ext'             => 'glb',
			'type'            => self::MIME,
			'proper_filename' => $data['proper_filename'],
		);
	}

	/**
	 * GLB files start with the ASCII magic "glTF" followed by container version 2.
	 *
	 * @param string $file Path to the file.
	 */
	private static function is_glb( $file ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a local temp file header.
		$header = file_get_contents( $file, false, null, 0, 8 );
		if ( false === $header || strlen( $header ) < 8 ) {
			return false;
		}
		$version = unpack( 'V', substr( $header, 4, 4 ) );
		return 'glTF' === substr( $header, 0, 4 ) && 2 === $version[1];
	}
}
