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
        Schema::table('orders', function (Blueprint $table) {
            // --- Job / Service site location ---
            $table->foreignId('job_location_id')
                ->nullable()
                ->constrained('customer_locations')
                ->nullOnDelete()
                ->after('customer_id');
            $table->text('job_address')->nullable()->after('job_location_id');
            $table->text('job_google_maps_link')->nullable()->after('job_address');
            $table->string('job_contact_person', 255)->nullable()->after('job_google_maps_link');
            $table->string('job_contact_phone', 50)->nullable()->after('job_contact_person');

            // --- Billing / Tax invoice location ---
            $table->foreignId('billing_location_id')
                ->nullable()
                ->constrained('customer_locations')
                ->nullOnDelete()
                ->after('job_contact_phone');
            $table->text('billing_address')->nullable()->after('billing_location_id');
            $table->string('billing_attention', 255)->nullable()->after('billing_address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('billing_location_id');
            $table->dropConstrainedForeignId('job_location_id');
            $table->dropColumn([
                'job_address',
                'job_google_maps_link',
                'job_contact_person',
                'job_contact_phone',
                'billing_address',
                'billing_attention',
            ]);
        });
    }
};
