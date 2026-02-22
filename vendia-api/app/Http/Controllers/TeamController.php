<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index()
    {
        $teams = Team::with(['members.user'])->orderBy('name')->get();

        return response()->json($teams);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'members' => 'array',
            'members.*.user_id' => 'required|exists:users,id',
            'members.*.is_lead' => 'boolean',
        ]);

        $team = Team::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if (!empty($validated['members'])) {
            foreach ($validated['members'] as $memberData) {
                TeamMember::create([
                    'team_id' => $team->id,
                    'user_id' => $memberData['user_id'],
                    'is_lead' => $memberData['is_lead'] ?? false,
                    'active_from' => now(),
                ]);
            }
        }

        return response()->json($team->load(['members.user']), 201);
    }

    public function show($id)
    {
        $team = Team::with(['members.user'])->findOrFail($id);

        return response()->json($team);
    }

    public function update(Request $request, $id)
    {
        $team = Team::with('members')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'members' => 'array',
            'members.*.user_id' => 'required|exists:users,id',
            'members.*.is_lead' => 'boolean',
        ]);

        $team->update([
            'name' => $validated['name'] ?? $team->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $team->description,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $team->is_active,
        ]);

        if (array_key_exists('members', $validated)) {
            $existingMembers = $team->members->keyBy('user_id');
            $newMembers = collect($validated['members'] ?? [])->keyBy('user_id');

            foreach ($existingMembers as $userId => $member) {
                if (!$newMembers->has($userId) && $member->active_to === null) {
                    $member->update([
                        'active_to' => now(),
                    ]);
                }
            }

            foreach ($newMembers as $userId => $memberData) {
                $existing = $existingMembers->get($userId);

                if ($existing) {
                    $existing->update([
                        'is_lead' => $memberData['is_lead'] ?? false,
                        'active_to' => null,
                        'active_from' => $existing->active_from ?? now(),
                    ]);
                } else {
                    TeamMember::create([
                        'team_id' => $team->id,
                        'user_id' => $userId,
                        'is_lead' => $memberData['is_lead'] ?? false,
                        'active_from' => now(),
                    ]);
                }
            }
        }

        return response()->json($team->fresh(['members.user']));
    }

    public function destroy($id)
    {
        $team = Team::findOrFail($id);

        $team->delete();

        return response()->noContent();
    }

    public function technicians()
    {
        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get();

        return response()->json($technicians);
    }
}

