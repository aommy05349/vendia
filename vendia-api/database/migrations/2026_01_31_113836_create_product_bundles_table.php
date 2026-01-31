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
        Schema::dropIfExists('product_bundles');
        Schema::create('product_bundles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('child_id')->constrained('products')->onDelete('cascade');
            $table->integer('quantity');
            $table->timestamps();
        });

        // Add 'bundle' to product_type enum
        // For SQLite, enums are just text, so we don't need to alter structure.
        // For MySQL/PostgreSQL, we need to update the column definition.
        if (DB::getDriverName() !== 'sqlite') {
             DB::statement("ALTER TABLE products MODIFY COLUMN product_type ENUM('single', 'variable', 'bundle') DEFAULT 'single'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_bundles');
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE products MODIFY COLUMN product_type ENUM('single', 'variable') DEFAULT 'single'");
        }
    }
};
