<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8', // Make password nullable for customers
            'role' => ['required', Rule::in(['admin', 'staff', 'customer', 'technician'])],
            'image' => 'nullable',
            'phone' => 'required|string|max:20|unique:users',
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
             // Set default password for customers if not provided? Or just leave it?
             // User model has password as NOT NULL usually.
             // Let's check User migration.
             if ($validated['role'] === 'customer') {
                 $validated['password'] = Hash::make('password'); // Default password for customers
             }
        }
        
        $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];

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
        $validated = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|nullable|string|min:8',
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff', 'customer', 'technician'])],
            'image' => 'nullable',
            'phone' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
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

        if (isset($validated['name'])) {
            $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];
        } elseif (isset($validated['first_name']) && isset($validated['last_name'])) {
            $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];
        } elseif (isset($validated['first_name'])) {
            $validated['name'] = $validated['first_name'] . ' ' . $user->last_name;
        } elseif (isset($validated['last_name'])) {
            $validated['name'] = $user->first_name . ' ' . $validated['last_name'];
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

    public function destroy(User $user)
    {
        $user->delete();
        return response()->noContent();
    }
}
