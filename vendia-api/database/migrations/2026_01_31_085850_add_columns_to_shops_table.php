<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('tax_id')->nullable()->after('phone');
            $table->string('email')->nullable()->after('tax_id');
            $table->string('website')->nullable()->after('email');
            $table->text('footer_text')->nullable()->after('website');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn(['tax_id', 'email', 'website', 'footer_text']);
        });
    }
};
