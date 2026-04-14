<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->date('issued_date')->nullable()->after('status');
            $table->boolean('show_issued_date')->default(true)->after('issued_date');
            $table->date('expires_date')->nullable()->after('show_issued_date');
            $table->boolean('show_expires_date')->default(false)->after('expires_date');
            $table->string('customer_name')->nullable()->after('show_expires_date');
            $table->text('customer_address')->nullable()->after('customer_name');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'issued_date',
                'show_issued_date',
                'expires_date',
                'show_expires_date',
                'customer_name',
                'customer_address',
            ]);
        });
    }
};

