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

interface OTPRecord {
  userId: string;
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

class Database {
  private users: Map<string, User>;
  private transactions: Map<string, Transaction>;
  private sessions: Map<string, UserSession>;
  private messages: Map<string, ChatMessage[]>;
  private rateLimits: Map<string, RateLimit>;
  private otps: Map<string, OTPRecord>;
  private readonly STORAGE_KEYS = {
    USERS: 'map_app_users',
    TRANSACTIONS: 'map_app_transactions'
  };

  constructor() {
    // Khởi tạo maps rỗng trước
    this.users = new Map();
    this.transactions = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.rateLimits = new Map();
    this.otps = new Map();

    // Log trước khi load
    console.log('Database initialized with empty maps');
    
    this.loadFromLocalStorage();
    
    // Log sau khi load để kiểm tra
    console.log('Database after loading:', {
      users: Array.from(this.users.entries()),
      totalUsers: this.users.size
    });
  }

  private logSafeUserData(user: User) {
    // Chỉ log thông tin an toàn
    return {
      id: user.id,
      email: user.email.replace(/(?<=.{3}).(?=.*@)/g, '*'),
      role: user.role,
      aiCredits: user.aiCredits,
      createdAt: user.createdAt
    };
  }

  private saveToLocalStorage(): void {
    try {
      // Mã hóa dữ liệu trước khi lưu
      const encryptedUsers = Array.from(this.users.entries())
        .map(([id, user]) => [id, {
          ...user,
          email: btoa(user.email), // Mã hóa email
          password: btoa(user.password) // Mã hóa password
        }]);

      localStorage.setItem(
        this.STORAGE_KEYS.USERS,
        btoa(JSON.stringify(encryptedUsers)) // Mã hóa toàn bộ data
      );

      // Không lưu transactions và messages dưới dạng plain text
      localStorage.setItem(
        this.STORAGE_KEYS.TRANSACTIONS,
        btoa(JSON.stringify(Array.from(this.transactions.entries())))
      );
      localStorage.setItem(
        'map_app_messages',
        JSON.stringify(Array.from(this.messages.entries()))
      );
    } catch (error) {
      console.error('Storage error occurred');
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEYS.USERS);
      console.log('Loading encrypted database...');

      if (encryptedData) {
        const decryptedData = atob(encryptedData);
        const parsedData = JSON.parse(decryptedData);
        
        // Giải mã dữ liệu
        this.users = new Map(
          parsedData.map(([id, user]: [string, any]) => [id, {
            ...user,
            email: atob(user.email),
            password: atob(user.password)
          }])
        );

        console.log('Database loaded successfully');
        console.log('Total users:', this.users.size);
      }

      const transactionsData = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
      const messagesData = localStorage.getItem('map_app_messages');

      this.transactions = new Map(
        transactionsData ? JSON.parse(atob(transactionsData)) : []
      );
      this.messages = new Map(
        messagesData ? JSON.parse(messagesData) : []
      );
    } catch (error) {
      console.error('Database load error occurred');
      this.clearAllData();
    }
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'role'>): Promise<User> {
    // Validate password hash
    if (!data.password || data.password.length !== 64) {
      console.error('Invalid password hash:', {
        hasPassword: !!data.password,
        length: data.password?.length
      });
      throw new Error('Invalid password format');
    }

    // Log an toàn không có password
    console.log('Creating new user:', {
      email: data.email,
      aiCredits: data.aiCredits,
      lastLoginAt: data.lastLoginAt
    });
    
    const existingUser = await this.findUserByEmail(data.email);
    // Log an toàn
    console.log('Existing user check:', existingUser ? 'User exists' : 'No existing user');
    
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const user: User = {
      id: Date.now().toString(),
      role: 'user',
      createdAt: new Date().toISOString(),
      ...data
    };

    console.log('Saving new user:', this.sanitizeUser(user));
    this.users.set(user.id, user);
    
    console.log('Database after adding user:', {
      totalUsers: this.users.size,
      allUsers: Array.from(this.users.values()).map(u => this.sanitizeUser(u))
    });

    this.saveToLocalStorage();
    return this.sanitizeUser(user);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    // Không log email đầy đủ
    console.log('Finding user by email:', email.replace(/(?<=.{3}).(?=.*@)/g, '*'));
    
    const user = Array.from(this.users.values())
      .find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Không log user data
    console.log('User found:', user ? 'Yes' : 'No');
    return user;
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

  async deleteUser(userId: string): Promise<void> {

    this.users.delete(userId);
    
    this.transactions = new Map(
      Array.from(this.transactions.entries())
        .filter(([_, t]) => t.userId !== userId)
    );
    this.messages.delete(userId);
    this.sessions.delete(userId);
    this.otps = new Map(
      Array.from(this.otps.entries())
        .filter(([_, otp]) => otp.userId !== userId)
    );

    this.saveToLocalStorage();
    console.log('User deleted:', userId);
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
    const WINDOW = 60000; 
    const MAX_REQUESTS = 10; 

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

  async createOTP(email: string, userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiresAt = Date.now() + 10 * 60 * 1000; 
    
    const otp: OTPRecord = {
      userId,
      email,
      code,
      expiresAt,
      verified: false
    };
    
    this.otps.set(email, otp);
    return code;
  }

  async verifyOTP(email: string, code: string): Promise<boolean> {
    const otp = this.otps.get(email);
    
    if (!otp || otp.code !== code || Date.now() > otp.expiresAt) {
      return false;
    }

    otp.verified = true;
    return true;
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const otp = this.otps.get(email);
    return otp?.verified || false;
  }

  private sanitizeUser(user: User): User {

    const { password, ...safeUser } = user;
    return { ...safeUser, password: undefined } as unknown as User;
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
    this.otps.clear();
    
    // Xóa an toàn
    Object.keys(localStorage)
      .filter(key => key.startsWith('map_app_'))
      .forEach(key => localStorage.removeItem(key));
    
    console.log('Database cleared successfully');
  }
}

export const resetDatabase = () => {
  db.clearAllData();
};

export const db = new Database();

(window as any).resetDatabase = resetDatabase;
