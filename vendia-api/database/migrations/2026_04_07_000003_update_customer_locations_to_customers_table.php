<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_locations', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        } else {
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->unsignedBigInteger('customer_id')->nullable()->after('id');
            });
            DB::table('customer_locations')->update([
                'customer_id' => DB::raw('user_id'),
            ]);
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }

        Schema::table('customer_locations', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('customer_locations', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->renameColumn('customer_id', 'user_id');
            });
        } else {
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            });
            DB::table('customer_locations')->update([
                'user_id' => DB::raw('customer_id'),
            ]);
            Schema::table('customer_locations', function (Blueprint $table) {
                $table->dropColumn('customer_id');
            });
        }

        Schema::table('customer_locations', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
