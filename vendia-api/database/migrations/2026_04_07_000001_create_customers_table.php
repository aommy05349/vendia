<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('company_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('line_id')->nullable();
            $table->timestamps();
        });

        if (!Schema::hasTable('users')) {
            return;
        }

        $exists = DB::table('users')->where('role', 'customer')->exists();
        if (!$exists) {
            return;
        }

        DB::table('users')
            ->where('role', 'customer')
            ->orderBy('id')
            ->chunkById(500, function ($users) {
                $rows = [];
                foreach ($users as $u) {
                    $rows[] = [
                        'id' => $u->id,
                        'name' => $u->company_name ?: ($u->name ?: trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''))),
                        'first_name' => $u->first_name,
                        'last_name' => $u->last_name,
                        'company_name' => $u->company_name,
                        'phone' => $u->phone,
                        'email' => $u->email,
                        'address' => $u->address,
                        'tax_id' => $u->tax_id,
                        'line_id' => $u->line_id,
                        'created_at' => $u->created_at,
                        'updated_at' => $u->updated_at,
                    ];
                }
                DB::table('customers')->upsert($rows, ['id'], [
                    'name',
                    'first_name',
                    'last_name',
                    'company_name',
                    'phone',
                    'email',
                    'address',
                    'tax_id',
                    'line_id',
                    'updated_at',
                ]);
            });

        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $maxId = DB::table('customers')->max('id') ?? 0;
            $hasSequence = DB::table('sqlite_master')
                ->where('type', 'table')
                ->where('name', 'sqlite_sequence')
                ->exists();
            if ($hasSequence) {
                $seqExists = DB::table('sqlite_sequence')->where('name', 'customers')->exists();
                if ($seqExists) {
                    DB::table('sqlite_sequence')->where('name', 'customers')->update(['seq' => $maxId]);
                } else {
                    DB::table('sqlite_sequence')->insert(['name' => 'customers', 'seq' => $maxId]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};

