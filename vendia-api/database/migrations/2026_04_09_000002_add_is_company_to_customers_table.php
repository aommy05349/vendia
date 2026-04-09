<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_company')->default(false);
        });

        DB::table('customers')->update([
            'is_company' => DB::raw(
                '(CASE WHEN company_name is not null AND trim(company_name) != "" AND ((first_name is null OR trim(first_name) = "") AND (last_name is null OR trim(last_name) = "")) THEN 1 ELSE 0 END)'
            ),
        ]);
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('is_company');
        });
    }
};

