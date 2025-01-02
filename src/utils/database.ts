import { ref } from 'vue'

interface User {
  id: string;
  email: string;
  password: string; // Hashed
  name?: string;
  aiCredits: number;
  createdAt: string;
  lastLoginAt: string;
  role: 'user' | 'admin';
  preferences?: {
    defaultMapStyle?: string;
    defaultLocation?: {
      lat: number;
      lng: number;
    }
  }
}

interface Transaction {
  id: string;
  userId: string;
  type: 'credit_purchase' | 'credit_use';
  amount: number;
  credits: number;
  createdAt: string;
}

interface UserSession {
  userId: string;
  lastActive: string;
  deviceInfo: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface RateLimit {
  userId: string;
  timestamp: number;
  count: number;
}

class Database {
  private users: Map<string, User>;
  private transactions: Map<string, Transaction>;
  private sessions: Map<string, UserSession>;
  private messages: Map<string, ChatMessage[]>;
  private rateLimits: Map<string, RateLimit>;
  private readonly STORAGE_KEYS = {
    USERS: 'map_app_users',
    TRANSACTIONS: 'map_app_transactions'
  };

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.rateLimits = new Map();
    this.loadFromLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.USERS,
        JSON.stringify(Array.from(this.users.entries()))
      );
      localStorage.setItem(
        this.STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify(Array.from(this.transactions.entries()))
      );
      localStorage.setItem(
        'map_app_messages',
        JSON.stringify(Array.from(this.messages.entries()))
      );
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const usersData = localStorage.getItem(this.STORAGE_KEYS.USERS);
      const transactionsData = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
      const messagesData = localStorage.getItem('map_app_messages');

      this.users = new Map(
        usersData ? JSON.parse(usersData) : []
      );
      this.transactions = new Map(
        transactionsData ? JSON.parse(transactionsData) : []
      );
      this.messages = new Map(
        messagesData ? JSON.parse(messagesData) : []
      );
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.users = new Map();
      this.transactions = new Map();
      this.messages = new Map();
    }
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'role'>): Promise<User> {
    const existingUser = await this.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const user: User = {
      id: Date.now().toString(),
      role: 'user',
      createdAt: new Date().toISOString(),
      ...data
    };

    this.users.set(user.id, user);
    this.saveToLocalStorage();
    return this.sanitizeUser(user);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const user = Array.from(this.users.values())
      .find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? this.sanitizeUser(user) : undefined;
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');

    delete updates.id;
    delete updates.role;
    delete updates.createdAt;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    this.saveToLocalStorage();
    
    return this.sanitizeUser(updatedUser);
  }

  createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const transaction: Transaction = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...data
    };

    this.transactions.set(transaction.id, transaction);
    this.saveToLocalStorage();
    return transaction;
  }

  getUserTransactions(userId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  async addCredits(userId: string, amount: number): Promise<number> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    user.aiCredits = (user.aiCredits || 0) + amount;
    this.users.set(userId, user);
    
    this.createTransaction({
      userId,
      type: 'credit_purchase',
      amount,
      credits: user.aiCredits
    });

    this.saveToLocalStorage();
    return user.aiCredits;
  }

  async useCredits(userId: string, amount: number = 1): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || (user.aiCredits || 0) < amount) return false;

    user.aiCredits -= amount;
    this.users.set(userId, user);
    
    this.createTransaction({
      userId,
      type: 'credit_use',
      amount: -amount,
      credits: user.aiCredits
    });

    this.saveToLocalStorage();
    return true;
  }

  async createSession(userId: string): Promise<void> {
    const session: UserSession = {
      userId,
      lastActive: new Date().toISOString(),
      deviceInfo: navigator.userAgent
    };
    this.sessions.set(userId, session);
    this.saveToLocalStorage();
  }
  async updateSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActive = new Date().toISOString();
      this.saveToLocalStorage();
    }
  }

  async saveUserMessage(userId: string, message: Omit<ChatMessage, 'id' | 'userId' | 'timestamp'>): Promise<void> {
    const userMessages = this.messages.get(userId) || [];
    
    if (userMessages.length >= 50) {
      userMessages.shift();
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId,
      ...message,
      timestamp: new Date().toISOString()
    };

    userMessages.push(newMessage);
    this.messages.set(userId, userMessages);
    this.saveToLocalStorage();
  }

  getUserMessages(userId: string): ChatMessage[] {
    return this.messages.get(userId) || [];
  }

  clearUserMessages(userId: string): void {
    this.messages.delete(userId);
    this.saveToLocalStorage();
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.rateLimits.get(userId);
    const WINDOW = 60000; // 1 minute
    const MAX_REQUESTS = 10; // 10 requests per minute

    if (!limit || (now - limit.timestamp) > WINDOW) {
      this.rateLimits.set(userId, {
        userId,
        timestamp: now,
        count: 1
      });
      return true;
    }

    if (limit.count >= MAX_REQUESTS) {
      return false;
    }

    limit.count++;
    return true;
  }

  private sanitizeUser(user: User): User {
    const { password, ...safeUser } = user;
    return safeUser as User;
  }

  async getAllUsers(adminId: string): Promise<User[]> {
    const admin = this.users.get(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    return Array.from(this.users.values()).map(this.sanitizeUser);
  }

  clearAllData(): void {
    this.users.clear();
    this.transactions.clear();
    this.messages.clear();
    this.sessions.clear();
    this.saveToLocalStorage();
    console.log('All data cleared');
  }
}

export const db = new Database();
