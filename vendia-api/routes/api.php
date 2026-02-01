<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\AttendanceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/shop', [ShopController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/shop', [ShopController::class, 'update']);

    Route::apiResource('users', UserController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('brands', BrandController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::get('/orders/daily-sales', [OrderController::class, 'dailySales']);
    Route::apiResource('orders', OrderController::class);

    // Attendance
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('/attendance/status', [AttendanceController::class, 'currentStatus']);
    Route::get('/attendance/overview', [AttendanceController::class, 'overview']);
    Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
    Route::get('/attendance/history/{user}', [AttendanceController::class, 'history']);
    Route::post('/attendance/absent', [AttendanceController::class, 'markAbsent']);
    Route::put('/attendance/{id}', [AttendanceController::class, 'update']);
    Route::get('/attendance', [AttendanceController::class, 'index']);

    // Customer Locations
    Route::get('/users/{user}/locations', [\App\Http\Controllers\CustomerLocationController::class, 'index']);
    Route::post('/customer-locations', [\App\Http\Controllers\CustomerLocationController::class, 'store']);
    Route::put('/customer-locations/{id}', [\App\Http\Controllers\CustomerLocationController::class, 'update']);
    Route::delete('/customer-locations/{id}', [\App\Http\Controllers\CustomerLocationController::class, 'destroy']);

    // Appointments
    Route::apiResource('appointments', \App\Http\Controllers\AppointmentController::class);
});
