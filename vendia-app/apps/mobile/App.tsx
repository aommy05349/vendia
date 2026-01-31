import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, FlatList, Alert } from 'react-native';
import { useAuthStore, useCartStore, api, Product } from '@vendia/shared';
import React, { useEffect, useState } from 'react';

export default function App() {
  const { user, login, logout } = useAuthStore();
  const { items, addToCart, removeFromCart, clearCart, total } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      await api.post('/orders', {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: 'cash',
      });
      Alert.alert('Success', 'Order placed successfully!');
      clearCart();
      fetchProducts(); // Refresh stock
    } catch (error) {
      Alert.alert('Error', 'Checkout failed!');
      console.error(error);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vendia POS</Text>
        <Button
          title="Login as Staff"
          onPress={() =>
            login(
              { id: 1, name: 'Staff', email: 'staff@vendia.com', role: 'staff' },
              'fake-token-for-now-needs-real-login'
            )
          }
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Button title="Logout" onPress={logout} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text>Stock: {item.stock}</Text>
            <Text>Price: ${item.price}</Text>
            <Button
              title={item.stock === 0 ? "Out of Stock" : "Add to Cart"}
              disabled={item.stock === 0}
              onPress={() => addToCart(item)}
            />
          </View>
        )}
      />

      <View style={styles.cartContainer}>
        <Text style={styles.cartTitle}>Cart (Total: ${total().toFixed(2)})</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.product.id.toString()}
          style={{ maxHeight: 150 }}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Text>{item.product.name} x {item.quantity}</Text>
              <Button title="Remove" onPress={() => removeFromCart(item.product.id)} />
            </View>
          )}
        />
        <Button
          title="Checkout"
          disabled={items.length === 0}
          onPress={handleCheckout}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  productCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cartContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 20,
    paddingBottom: 20,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
});
