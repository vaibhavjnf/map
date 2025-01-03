import { supabase, Tables } from './supabase'
import { db as firestore, Collections } from './firebase'
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import type { Database } from '../types/supabase'

type User = Database['public']['Tables']['users']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

export class DatabaseService {
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      // Thử tạo ở cả 2 database để đồng bộ
      const [supabaseResult, firestoreDoc] = await Promise.all([
        supabase.from(Tables.USERS).insert(userData).select().single(),
        addDoc(collection(firestore, Collections.USERS), userData)
      ]);

      if (supabaseResult.data) {
        return supabaseResult.data;
      }

      return { id: firestoreDoc.id, ...userData } as User;
    } catch (error) {
      console.error('Error creating user:', error)
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      // Tìm song song ở cả 2 database
      const [supabaseResult, firestoreQuery] = await Promise.all([
        supabase.from(Tables.USERS).select().eq('email', email.toLowerCase()).single(),
        getDocs(query(
          collection(firestore, Collections.USERS), 
          where('email', '==', email.toLowerCase())
        ))
      ]);

      // Ưu tiên data từ Supabase
      if (supabaseResult.data) {
        console.log('Found user in Supabase:', supabaseResult.data);
        return supabaseResult.data;
      }

      // Nếu không có trong Supabase, kiểm tra Firebase
      if (!firestoreQuery.empty) {
        const userData = firestoreQuery.docs[0].data();
        console.log('Found user in Firebase:', userData);
        return { id: firestoreQuery.docs[0].id, ...userData } as User;
      }

      console.log('User not found in either database');
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null; // Return null instead of throwing
    }
  }

  async migrateFromLocalStorage() {
    try {      // Lấy data từ localStorage
      const localUsers = this.getLocalStorageData('map_app_users');
      const localTransactions = this.getLocalStorageData('map_app_transactions');
      
      if (localUsers) {
        for (const user of localUsers) {
          await this.migrateUser(user);
        }
      }

      if (localTransactions) {
        for (const transaction of localTransactions) {
          await this.migrateTransaction(transaction);
        }
      }

      // Xóa data cũ từ localStorage
      this.clearLocalStorage();
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private async migrateUser(userData: any): Promise<void> {
    const existingUser = await this.findUserByEmail(userData.email);
    if (!existingUser) {
      await this.createUser({
        ...userData,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
    }
  }

  private async migrateTransaction(transactionData: any): Promise<void> {
    const { data: existingTransaction } = await supabase
      .from(Tables.TRANSACTIONS)
      .select()
      .eq('id', transactionData.id)
      .single();

    if (!existingTransaction) {
      await Promise.all([
        supabase.from(Tables.TRANSACTIONS).insert(transactionData),
        addDoc(collection(firestore, Collections.TRANSACTIONS), transactionData)
      ]);
    }
  }

  private getLocalStorageData(key: string): any[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(atob(data)) : [];
    } catch {
      return [];
    }
  }

  private clearLocalStorage(): void {
    const keys = [
      'map_app_users',
      'map_app_transactions',
      'map_app_messages',
      'remembered_email',
      'remembered_password',
      'userId'
    ];
    keys.forEach(key => localStorage.removeItem(key));
  }
}

export const db = new DatabaseService();
