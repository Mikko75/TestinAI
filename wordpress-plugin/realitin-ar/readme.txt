=== Realitin AR ===
Contributors: realitin
Tags: woocommerce, augmented reality, ar, 3d, furniture
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let shoppers view your furniture in 3D and place it in their own room with their phone's camera.

== Description ==

Realitin AR adds a "View in your room" button to WooCommerce product pages that have a 3D model.

* The button opens a 3D view that shoppers can rotate and zoom.
* On compatible phones the shopper can place the product in their room at its real size (iPhone: AR Quick Look, Android: WebXR or Google Scene Viewer).
* Other devices keep the 3D view and get a short explanation.
* The 3D viewer (about 1 MB) is loaded only when the shopper opens the view, so product pages stay fast.

Uses Google's open source [model-viewer](https://modelviewer.dev/) component (Apache 2.0), bundled with the plugin.

== Installation ==

1. Upload the plugin and activate it. WooCommerce must be active.
2. Edit a product. In the "3D model (Realitin AR)" box, select or upload a GLB file.
3. Update the product. The button appears below the add to cart button.

To place the button elsewhere, return false from the `realitin_ar_auto_insert` filter and use the `[realitin_ar]` shortcode (optionally `[realitin_ar id="123"]`).

== Frequently Asked Questions ==

= Which 3D files are supported? =

GLB (binary glTF 2.0). The model should be in metres, stand on the floor (lowest point at zero) and face forward. iPhone AR files are generated automatically from the GLB.

= Is the size in AR accurate? =

The model is shown at the size stored in the GLB file. Check the model's dimensions before publishing.

== Changelog ==

= 0.1.0 =
* First version: GLB model per product, 3D dialog and AR button.
