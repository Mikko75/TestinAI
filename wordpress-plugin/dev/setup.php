<?php
/**
 * Development store: products with and without a 3D model.
 * Run by blueprint.json; the repository's public/models folder is mounted at /realitin-models.
 */

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

wp_set_current_user( 1 );

// Playground's default admin password is public knowledge; the store may be shared through a tunnel.
wp_set_password( wp_generate_password( 32 ), 1 );

// Show the shop to visitors (new WooCommerce stores start in "coming soon" mode).
update_option( 'woocommerce_coming_soon', 'no' );
update_option( 'woocommerce_store_pages_only', 'no' );

$products = array(
	array( 'Velvet Lounge Chair', 'SheenChair.glb', '499' ),
	array( 'Velvet Sofa Bed', 'GlamVelvetSofa.glb', '1299' ),
	array( 'Oak Side Table (no 3D model)', null, '149' ),
);

foreach ( $products as list( $name, $model, $price ) ) {
	$product = new WC_Product_Simple();
	$product->set_name( $name );
	$product->set_regular_price( $price );
	$product->set_status( 'publish' );
	$product_id = $product->save();

	if ( ! $model ) {
		continue;
	}
	// Goes through the normal upload checks, including the plugin's GLB validation.
	$tmp = wp_tempnam( $model );
	copy( '/realitin-models/' . $model, $tmp );
	$attachment_id = media_handle_sideload( array( 'name' => $model, 'tmp_name' => $tmp ), $product_id );
	if ( is_wp_error( $attachment_id ) ) {
		error_log( 'Realitin AR dev setup: ' . $model . ': ' . $attachment_id->get_error_message() );
		continue;
	}
	update_post_meta( $product_id, REALITIN_AR_META_MODEL, $attachment_id );
}
