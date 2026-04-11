<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
            $table->foreignId('warehouse_id')->nullable()->after('category_id');
            $table->foreignId('brand_id')->nullable()->after('warehouse_id');
            $table->foreignId('unit_id')->nullable()->after('brand_id');
            $table->string('barcode_symbology')->default('Code128')->after('sku');
            $table->string('barcode')->nullable()->unique()->after('barcode_symbology');
            $table->enum('product_type', ['single', 'variable'])->default('single')->after('barcode');
            $table->enum('tax_type', ['exclusive', 'inclusive'])->default('exclusive')->after('price');
            $table->decimal('tax_amount', 8, 2)->default(0)->after('tax_type'); // Using simple amount for now
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed')->after('tax_amount');
            $table->decimal('discount_value', 8, 2)->default(0)->after('discount_type');
            $table->integer('quantity_alert')->default(0)->after('stock');
        });

        if (DB::getDriverName() !== 'sqlite' && Schema::hasTable('brands')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreign('brand_id')->references('id')->on('brands');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropForeign(['brand_id']);
            $table->dropForeign(['unit_id']);
            $table->dropColumn([
                'slug', 'warehouse_id', 'brand_id', 'unit_id',
                'barcode_symbology', 'barcode', 'product_type',
                'tax_type', 'tax_amount', 'discount_type', 'discount_value',
                'quantity_alert'
            ]);
        });
    }
};
