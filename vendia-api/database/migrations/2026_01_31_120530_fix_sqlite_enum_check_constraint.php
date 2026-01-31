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
        // Only run for SQLite which doesn't support ALTER TABLE DROP/MODIFY COLUMN effectively
        // and enforces CHECK constraints created at table creation time
        if (DB::getDriverName() === 'sqlite') {
            // 1. Create a temporary table with the new schema (including 'bundle' in CHECK constraint)
            Schema::create('products_temp', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->nullable()->unique();
                $table->text('description')->nullable();
                $table->decimal('price', 10, 2);
                $table->integer('stock')->default(0);
                $table->string('sku')->unique();
                $table->foreignId('category_id')->nullable()->constrained();
                $table->foreignId('warehouse_id')->nullable()->constrained();
                $table->foreignId('brand_id')->nullable()->constrained();
                $table->foreignId('unit_id')->nullable()->constrained();
                $table->string('barcode_symbology')->default('Code128');
                $table->string('barcode')->nullable()->unique();
                
                // This is the key change: adding 'bundle' to the enum/check constraint
                $table->enum('product_type', ['single', 'variable', 'bundle'])->default('single');
                
                $table->enum('tax_type', ['exclusive', 'inclusive'])->default('exclusive');
                $table->decimal('tax_amount', 8, 2)->default(0);
                $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
                $table->decimal('discount_value', 8, 2)->default(0);
                $table->integer('quantity_alert')->default(0);
                $table->timestamps();
            });

            // 2. Copy data from old table to new table
            // We select columns explicitly to ensure mapping is correct
            DB::statement('INSERT INTO products_temp (
                id, name, slug, description, price, stock, sku, category_id, warehouse_id, brand_id, unit_id, 
                barcode_symbology, barcode, product_type, tax_type, tax_amount, discount_type, discount_value, 
                quantity_alert, created_at, updated_at
            ) SELECT 
                id, name, slug, description, price, stock, sku, category_id, warehouse_id, brand_id, unit_id, 
                barcode_symbology, barcode, product_type, tax_type, tax_amount, discount_type, discount_value, 
                quantity_alert, created_at, updated_at 
            FROM products');

            // 3. Drop old table
            Schema::drop('products');

            // 4. Rename temporary table to original name
            Schema::rename('products_temp', 'products');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting this is complex and risky for data integrity if 'bundle' types exist,
        // so we generally skip strict reversion of enum expansion in SQLite unless critical.
    }
};
