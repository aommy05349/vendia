<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return User::latest()->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'image' => 'nullable|image|max:2048', // Max 2MB
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('users', 'public');
            $validated['image'] = $path;
        }

        $validated['password'] = Hash::make($validated['password']);
        $validated['name'] = $validated['first_name'] . ' ' . $validated['last_name'];

        $user = User::create($validated);

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
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff'])],
            'image' => 'nullable|image|max:2048',
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

        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $first = $validated['first_name'] ?? $user->first_name;
            $last = $validated['last_name'] ?? $user->last_name;
            $validated['name'] = $first . ' ' . $last;
        }

        $user->update($validated);

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->noContent();
    }
}
