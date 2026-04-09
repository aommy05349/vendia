<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    private function isExternalUrl(?string $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }

    public function index(Request $request)
    {
        $query = User::latest();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('exclude_role')) {
            $query->where('role', '!=', $request->exclude_role);
        }

        if ($request->boolean('has_available_order_for_appointment')) {
            $query->whereExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('orders')
                    ->whereColumn('orders.customer_id', 'users.id')
                    ->whereIn('orders.status', ['pending', 'completed'])
                    ->whereNotExists(function ($sub2) {
                        $sub2->select(DB::raw(1))
                            ->from('appointments')
                            ->whereColumn('appointments.order_id', 'orders.id');
                    });
            });
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return $query->paginate($request->input('per_page', 10));
    }

    public function store(Request $request)
    {
        $role = $request->input('role');
        $isCustomer = $role === 'customer';

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'staff', 'customer', 'technician'])],
            'username' => [
                $isCustomer ? 'nullable' : 'required',
                'string',
                'max:255',
                Rule::unique('users', 'username'),
            ],
            'first_name' => [$isCustomer ? 'nullable' : 'required', 'string', 'max:255'],
            'last_name' => [$isCustomer ? 'nullable' : 'required', 'string', 'max:255'],
            'name' => [$isCustomer ? 'nullable' : 'prohibited', 'string', 'max:255'],
            'email' => [
                $isCustomer ? 'nullable' : 'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'password' => [$isCustomer ? 'nullable' : 'required', 'string', 'min:8'],
            'image' => 'nullable',
            'phone' => [
                $isCustomer ? 'nullable' : 'required',
                'string',
                'max:20',
                Rule::unique('users', 'phone'),
            ],
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'line_id' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('image')) {
            $request->validate(['image' => 'image|max:2048']);
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
        } elseif (isset($validated['image']) && is_string($validated['image']) && $validated['image'] !== '') {
            $validated['image'] = trim($validated['image']);
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            if ($validated['role'] === 'customer') {
                $validated['password'] = Hash::make('password');
            }
        }

        if ($validated['role'] === 'customer') {
            $validated['email'] = isset($validated['email']) && is_string($validated['email']) ? trim($validated['email']) : null;
            $validated['username'] = isset($validated['username']) && is_string($validated['username']) ? trim($validated['username']) : null;
            $validated['first_name'] = isset($validated['first_name']) && is_string($validated['first_name']) ? trim($validated['first_name']) : null;
            $validated['last_name'] = isset($validated['last_name']) && is_string($validated['last_name']) ? trim($validated['last_name']) : null;
            $validated['name'] = isset($validated['name']) && is_string($validated['name']) ? trim($validated['name']) : null;
            $validated['company_name'] = isset($validated['company_name']) && is_string($validated['company_name']) ? trim($validated['company_name']) : null;

            if ($validated['email'] === '') $validated['email'] = null;
            if ($validated['username'] === '') $validated['username'] = null;
            if ($validated['first_name'] === '') $validated['first_name'] = null;
            if ($validated['last_name'] === '') $validated['last_name'] = null;
            if ($validated['name'] === '') $validated['name'] = null;
            if ($validated['company_name'] === '') $validated['company_name'] = null;

            $generatedId = 'cust_' . Str::lower(Str::random(16));

            if (!$validated['email']) {
                $validated['email'] = $generatedId . '@example.com';
            }

            if (!$validated['username']) {
                $validated['username'] = $validated['email'] ?: $generatedId;
            }

            if (!$validated['name']) {
                if ($validated['company_name']) {
                    $validated['name'] = $validated['company_name'];
                } else {
                    $full = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
                    $validated['name'] = $full !== '' ? $full : 'Walk-in Customer';
                }
            }

            if (!$validated['first_name'] || !$validated['last_name']) {
                if ($validated['company_name']) {
                    $validated['first_name'] = $validated['first_name'] ?: $validated['company_name'];
                    $validated['last_name'] = $validated['last_name'] ?: '-';
                } else {
                    $validated['first_name'] = $validated['first_name'] ?: $validated['name'];
                    $validated['last_name'] = $validated['last_name'] ?: '-';
                }
            }
        } else {
            $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];
        }

        try {
            $user = User::create($validated);
        } catch (QueryException $e) {
            if ($e->errorInfo[1] == 19) { // SQLite unique constraint violation
                throw ValidationException::withMessages([
                    'phone' => ['The phone has already been taken.'],
                ]);
            }
            throw $e;
        }

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return $user;
    }

    public function update(Request $request, User $user)
    {
        $role = $request->input('role', $user->role);
        $isCustomer = $role === 'customer';

        $validated = $request->validate([
            'username' => $isCustomer
                ? ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('users')->ignore($user->id)]
                : ['sometimes', 'required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'first_name' => $isCustomer ? 'sometimes|nullable|string|max:255' : 'sometimes|required|string|max:255',
            'last_name' => $isCustomer ? 'sometimes|nullable|string|max:255' : 'sometimes|required|string|max:255',
            'email' => $isCustomer
                ? ['sometimes', 'nullable', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)]
                : ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|nullable|string|min:8',
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff', 'customer', 'technician'])],
            'image' => 'nullable',
            'phone' => $isCustomer
                ? ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users')->ignore($user->id)]
                : ['sometimes', 'required', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'line_id' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('image')) {
            $request->validate(['image' => 'image|max:2048']);
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
        } elseif (isset($validated['image']) && is_string($validated['image']) && $validated['image'] !== '') {
            $validated['image'] = trim($validated['image']);
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if ($isCustomer) {
            if (array_key_exists('email', $validated) && is_string($validated['email']) && trim($validated['email']) === '') {
                unset($validated['email']);
            }
            if (array_key_exists('phone', $validated) && is_string($validated['phone']) && trim($validated['phone']) === '') {
                unset($validated['phone']);
            }
            if (array_key_exists('first_name', $validated) && is_string($validated['first_name']) && trim($validated['first_name']) === '') {
                unset($validated['first_name']);
            }
            if (array_key_exists('last_name', $validated) && is_string($validated['last_name']) && trim($validated['last_name']) === '') {
                unset($validated['last_name']);
            }
            if (array_key_exists('company_name', $validated) && is_string($validated['company_name']) && trim($validated['company_name']) === '') {
                $validated['company_name'] = null;
            }

            $nextCompany = array_key_exists('company_name', $validated) ? $validated['company_name'] : $user->company_name;
            $nextFirst = array_key_exists('first_name', $validated) ? $validated['first_name'] : $user->first_name;
            $nextLast = array_key_exists('last_name', $validated) ? $validated['last_name'] : $user->last_name;

            $display = $nextCompany ?: trim(($nextFirst ?? '') . ' ' . ($nextLast ?? ''));
            if ($display === '') {
                $display = $user->name ?: 'Walk-in Customer';
            }
            $validated['name'] = $display;

            if (!array_key_exists('first_name', $validated) && !$nextFirst) {
                $validated['first_name'] = $display;
            }
            if (!array_key_exists('last_name', $validated) && !$nextLast) {
                $validated['last_name'] = '-';
            }
        } else {
            if (isset($validated['name'])) {
                $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];
            } elseif (isset($validated['first_name']) && isset($validated['last_name'])) {
                $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];
            } elseif (isset($validated['first_name'])) {
                $validated['name'] = $validated['first_name'] . ' ' . $user->last_name;
            } elseif (isset($validated['last_name'])) {
                $validated['name'] = $user->first_name . ' ' . $validated['last_name'];
            }
        }

        try {
            $user->update($validated);
        } catch (QueryException $e) {
            if ($e->errorInfo[1] == 19) { // SQLite unique constraint violation
                throw ValidationException::withMessages([
                    'phone' => ['The phone has already been taken.'],
                ]);
            }
            throw $e;
        }

        return $user;
    }

    public function destroy(Request $request, User $user)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($actor->id === $user->id) {
            return response()->json([
                'message' => 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้',
            ], 422);
        }

        if ($actor->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->delete();
        return response()->noContent();
    }
}
