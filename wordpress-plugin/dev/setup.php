<?php
/**
 * Development store: products with and without a 3D model.
 * Run by blueprint.json; the repository's public/models folder is mounted at /realitin-models.
 */

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

wp_set_current_user( 1 );

// Playground's default admin password is public knowledge. When the store is shared through a tunnel
// (npm run wp:dev:public), replace it; locally it is needed for automatic login.
if ( defined( 'REALITIN_DEV_PUBLIC' ) ) {
	wp_set_password( defined( 'REALITIN_DEV_ADMIN_PASSWORD' ) ? REALITIN_DEV_ADMIN_PASSWORD : wp_generate_password( 32 ), 1 );
}

// Show the shop to visitors (new WooCommerce stores start in "coming soon" mode).
update_option( 'woocommerce_coming_soon', 'no' );
update_option( 'woocommerce_store_pages_only', 'no' );
// The test product dimensions below are in centimetres (a new US store defaults to inches).
update_option( 'woocommerce_dimension_unit', 'cm' );

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

// Product with a photo but no 3D model: for testing "Generate 3D model".
// The photo is a render of the CC0 SheenChair model (fixtures/lounge-chair-photo.jpg).
$product = new WC_Product_Simple();
$product->set_name( 'Tufted Lounge Chair (generate from photo)' );
$product->set_regular_price( '549' );
$product->set_status( 'publish' );
// WooCommerce dimensions (store unit cm): length = side to side, width = front to back.
$product->set_length( '83' );
$product->set_width( '57' );
$product->set_height( '69' );
$product_id = $product->save();
$tmp        = wp_tempnam( 'lounge-chair-photo.jpg' );
copy( '/realitin-dev/fixtures/lounge-chair-photo.jpg', $tmp );
$image_id = media_handle_sideload( array( 'name' => 'lounge-chair-photo.jpg', 'tmp_name' => $tmp ), $product_id );
if ( ! is_wp_error( $image_id ) ) {
	set_post_thumbnail( $product_id, $image_id );
}

// Parametric model built from a product photo (npm run models:parametric). The photo is kept in
// dev/private, which is not committed because the image rights belong to the manufacturer.
$photo = '/realitin-dev/private/leather-recliner-sofa-photo.png';
if ( file_exists( $photo ) && file_exists( '/realitin-models/ParametricReclinerSofa.glb' ) ) {
	$product = new WC_Product_Simple();
	$product->set_name( 'Leather Power Reclining Sofa (parametric model)' );
	$product->set_regular_price( '2199' );
	$product->set_status( 'publish' );
	$product->set_length( '220' );
	$product->set_width( '100' );
	$product->set_height( '103' );
	$product_id = $product->save();

	$tmp      = wp_tempnam( 'sofa-photo.png' );
	copy( $photo, $tmp );
	$image_id = media_handle_sideload( array( 'name' => 'leather-recliner-sofa-photo.png', 'tmp_name' => $tmp ), $product_id );
	if ( ! is_wp_error( $image_id ) ) {
		set_post_thumbnail( $product_id, $image_id );
	}
	$tmp      = wp_tempnam( 'ParametricReclinerSofa.glb' );
	copy( '/realitin-models/ParametricReclinerSofa.glb', $tmp );
	$model_id = media_handle_sideload( array( 'name' => 'ParametricReclinerSofa.glb', 'tmp_name' => $tmp ), $product_id );
	if ( ! is_wp_error( $model_id ) ) {
		update_post_meta( $product_id, REALITIN_AR_META_MODEL, $model_id );
	}
}
