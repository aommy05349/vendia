<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:quotation,billing_note,receipt',
            'status' => 'sometimes|in:active,cancelled',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'per_page' => 'sometimes|integer|min:1|max:200',
        ]);

        $query = Document::query()
            ->with(['order.customer', 'order.user'])
            ->orderByDesc('issued_date')
            ->orderByDesc('id');

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;
        if ($startDate || $endDate) {
            $query->where(function ($q) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $q->whereBetween('issued_date', [$startDate, $endDate]);
                } elseif ($startDate) {
                    $q->whereDate('issued_date', '>=', $startDate);
                } else {
                    $q->whereDate('issued_date', '<=', $endDate);
                }
            });
        }

        return $query->paginate($validated['per_page'] ?? 20);
    }

    public function show(Document $document)
    {
        return $document->load([
            'order',
            'order.items.product',
            'order.user',
            'order.customer',
            'order.parent',
            'order.documents',
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $validated = $request->validate([
            'issued_date' => 'sometimes|nullable|date',
            'show_issued_date' => 'sometimes|boolean',
            'expires_date' => 'sometimes|nullable|date',
            'show_expires_date' => 'sometimes|boolean',
            'customer_name' => 'sometimes|nullable|string|max:255',
            'customer_address' => 'sometimes|nullable|string',
        ]);

        $document->update($validated);
        return response()->json($document->fresh()->load(['order.customer']));
    }
}

