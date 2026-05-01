<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('shops')
            ->whereNull('authorized_signatory_name')
            ->orWhere('authorized_signatory_name', '')
            ->update(['authorized_signatory_name' => 'นางสาวธิดาลักษณ์ มุขธะวัตร']);
    }

    public function down(): void
    {
        DB::table('shops')
            ->where('authorized_signatory_name', 'นางสาวธิดาลักษณ์ มุขธะวัตร')
            ->update(['authorized_signatory_name' => null]);
    }
};

