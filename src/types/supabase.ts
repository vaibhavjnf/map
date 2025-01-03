export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password: string
          name?: string
          aiCredits: number
          createdAt: string
          lastLoginAt: string
          role: 'user' | 'admin'
          preferences?: {
            defaultMapStyle?: string
            defaultLocation?: {
              lat: number
              lng: number
            }
          }
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'createdAt'>  
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      transactions: {
        Row: {
          id: string
          userId: string
          type: 'credit_purchase' | 'credit_use'
          amount: number
          credits: number
          createdAt: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'createdAt'>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }
      messages: {
        Row: {
          id: string
          userId: string
          role: 'user' | 'model'
          content: string
          timestamp: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'timestamp'> 
        Update: Partial<Database['public']['Tables']['messages']['Row']>
      }
    }
  }
}
