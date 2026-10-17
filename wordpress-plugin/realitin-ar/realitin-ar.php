<?php
/**
 * Plugin Name:       Realitin AR
 * Description:       Shows a 3D model and a "View in your room" augmented reality button on WooCommerce product pages.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            Realitin
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       realitin-ar
 * Domain Path:       /languages
 *
 * @package RealitinAR
 */

defined( 'ABSPATH' ) || exit;

define( 'REALITIN_AR_VERSION', '0.1.0' );
define( 'REALITIN_AR_FILE', __FILE__ );
define( 'REALITIN_AR_DIR', plugin_dir_path( __FILE__ ) );
define( 'REALITIN_AR_URL', plugin_dir_url( __FILE__ ) );

/** Product meta key holding the attachment ID of the product's GLB model. */
define( 'REALITIN_AR_META_MODEL', '_realitin_ar_model_id' );

require_once REALITIN_AR_DIR . 'includes/class-realitin-ar-model-files.php';
require_once REALITIN_AR_DIR . 'includes/class-realitin-ar-admin.php';
require_once REALITIN_AR_DIR . 'includes/class-realitin-ar-frontend.php';

add_action(
	'init',
	static function () {
		load_plugin_textdomain( 'realitin-ar', false, dirname( plugin_basename( REALITIN_AR_FILE ) ) . '/languages' );
	}
);

Realitin_AR_Model_Files::init();

add_action(
	'plugins_loaded',
	static function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		if ( is_admin() ) {
			Realitin_AR_Admin::init();
		}
		Realitin_AR_Frontend::init();
	}
);

/**
 * Returns the GLB model URL for a product, or null if the product has no model.
 *
 * @param int $product_id Product ID.
 */
function realitin_ar_get_model_url( $product_id ) {
	$attachment_id = (int) get_post_meta( $product_id, REALITIN_AR_META_MODEL, true );
	if ( ! $attachment_id ) {
		return null;
	}
	$url = wp_get_attachment_url( $attachment_id );
	return $url ? $url : null;
}
