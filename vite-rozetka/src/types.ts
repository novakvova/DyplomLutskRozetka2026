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
  oldPrice: number | null
  stock: number
  averageRating: number | null
  reviewCount: number
  categoryId: number
  categoryName: string
  imageUrl: string | null
}

export type Characteristic = {
  name: string
  value: string
}

export type Category = {
  id: number
  name: string
}

export type AdminProduct = {
  id: number
  name: string
  shortDescription: string
  fullDescription: string
  price: number
  stock: number
  categoryId: number
  manufacturerUrl: string | null
  imageUrls: string[]
  characteristics: Characteristic[]
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
  fullDescription: string
  manufacturerUrl: string | null
  images: string[]
  characteristics: Characteristic[]
  canReview: boolean
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
  imageUrl: string | null
}

export type City = {
  ref: string
  name: string
}

export type Warehouse = {
  ref: string
  name: string
}

export type PaymentStart = {
  mode: 'demo' | 'liqpay'
  message: string
  data: string | null
  signature: string | null
  order: Order | null
}

export type OrderStatus = 'New' | 'AwaitingPayment' | 'Processing' | 'Completed' | 'Cancelled'

export type OrderItem = {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type AdminOrder = Order & {
  userEmail: string
}

export type AdminUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  isBlocked: boolean
  createdAt: string
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
