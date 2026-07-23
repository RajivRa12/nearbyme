export type BusinessCategory = "Salon" | "Spa" | "Clinic" | "Massage" | "Barber" | "Nail studio" | "Tattoo" | "Makeup artist" | "Home services" | "Wellness centre" | "Beauty academy";

export type Business = {
  id: string;
  name: string;
  type: BusinessCategory;
  neighborhood: string;
  distance: string;
  rating: number;
  reviews: number;
  priceRange: "$$" | "$$$" | "$$$$";
  tags: string[];
  cover: string;
  gallery: string[];
  about: string;
  isVerified: boolean;
  isOpenNow: boolean;
  availableToday: boolean;
  startingPrice: number;
  membershipAccepted: boolean;
  amenities: string[];
  cancellationPolicy: string;
};

export const businesses: Business[] = [];

export type Therapist = {
  id: string;
  name: string;
  role: string;
  businessId: string;
  rating: number;
  years: number;
  bio: string;
  avatar: string;
  specialties: string[];
};

export const therapists: Therapist[] = [];

export type Service = {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  businessId: string;
  description: string;
  trending?: boolean;
};

export const services: Service[] = [];

export type Offer = {
  id: string;
  title: string;
  discount: string;
  ends: string;
  type: "flash" | "exclusive" | "seasonal";
  businessId?: string;
  image?: string;
};

export const offers: Offer[] = [];

export type Booking = {
  id: string;
  businessId: string;
  serviceId: string;
  therapistId: string;
  when: string;
  status: "Booked" | "Confirmed" | "On the way" | "In progress" | "Complete" | "Cancelled";
  amount: number;
  mode?: "salon" | "home";
  address?: string;
};

export const HOME_SURCHARGE = 25;

export const bookings: Booking[] = [];

export type Membership = {
  id: string;
  name: string;
  tier: "Silver" | "Gold" | "Platinum";
  price: number;
  cadence: "month";
  perks: string[];
  current?: boolean;
};

export const memberships: Membership[] = [];

export const wallet = {
  balance: 0,
  transactions: [],
};

export const rewards = {
  points: 0,
  tier: "None",
  nextTier: "None",
  toNextTier: 0,
  perks: [],
};

export const reviews = [];

export const invoices = [];

export const packages = [];

export const giftCards = [];

export const notifications = [];

export const user = {
  firstName: "",
  fullName: "",
  email: "",
  phone: "",
  location: "",
  addresses: [],
  emergency: { name: "", relation: "", phone: "" },
  paymentMethods: [],
  favoriteBusinessIds: [],
};

export function findBusiness(id: string) { return businesses.find(s => s.id === id); }
export function findTherapist(id: string) { return therapists.find(t => t.id === id); }
export function findService(id: string) { return services.find(s => s.id === id); }
export function findBooking(id: string) { return bookings.find(b => b.id === id); }
export function servicesFor(businessId: string) { return services.filter(s => s.businessId === businessId); }
export function therapistsFor(businessId: string) { return therapists.filter(t => t.businessId === businessId); }
