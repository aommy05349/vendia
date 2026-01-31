<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::latest();

        if ($request->has('role')) {
            $query->where('role', $request->role);
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
            'role' => ['required', Rule::in(['admin', 'staff', 'customer'])],
            'image' => 'nullable|image|max:2048', // Max 2MB
            'phone' => 'required|string|max:20|unique:users',
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'line_id' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
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
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff', 'customer'])],
            'image' => 'nullable|image|max:2048',
            'phone' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'line_id' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
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
