<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$order = App\Models\Order::with('items.product')->latest()->first();
if ($order) {
    echo json_encode($order->toArray(), JSON_PRETTY_PRINT);
} else {
    echo "No orders found.";
}
