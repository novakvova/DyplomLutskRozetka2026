export type User = {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  hasPassword: boolean
}

export type AuthResponse = {
  accessToken: string
  user: User
}

export type MessageResponse = {
  message: string
  resetUrl?: string | null
}

export type Product = {
  id: number
  name: string
  shortDescription: string
  price: number
  stock: number
  averageRating: number | null
  reviewCount: number
}

export type Review = {
  id: number
  rating: number
  text: string
  authorName: string
  createdAt: string
  isMine: boolean
}

export type ProductDetails = Product & {
  isFavorite: boolean
  cartQuantity: number
  myReview: Review | null
  reviews: Review[]
}

export type CartLine = {
  productId: number
  name: string
  unitPrice: number
  quantity: number
  stock: number
  lineTotal: number
}

export type Cart = {
  items: CartLine[]
  total: number
}

export type Favorite = {
  productId: number
  name: string
  shortDescription: string
  price: number
  stock: number
}

export type OrderStatus = 'New' | 'AwaitingPayment' | 'Processing' | 'Completed' | 'Cancelled'

export type OrderItem = {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type Order = {
  id: number
  createdAt: string
  status: OrderStatus
  recipientName: string
  phone: string
  city: string
  deliveryMethod: string
  deliveryAddress: string
  paymentMethod: string
  comment: string | null
  total: number
  items: OrderItem[]
}
