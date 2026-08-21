import { Scissors, Droplet, Activity, Heart, Sparkles, PenTool, Brush, Home as HomeIcon, BookOpen } from "lucide-react-native";

// Values must match apps.core.models.BusinessType on the backend exactly —
// used as the real `?business__business_type=` filter on /api/customer/stores/.
export const CATEGORIES = [
  { id: "SALON", name: "Salon", icon: Scissors },
  { id: "SPA", name: "Spa", icon: Droplet },
  { id: "BEAUTY_CLINIC", name: "Clinic", icon: Activity },
  { id: "MASSAGE_CENTER", name: "Massage", icon: Heart },
  { id: "BARBER_SHOP", name: "Barber", icon: Scissors },
  { id: "NAIL_STUDIO", name: "Nail studio", icon: Sparkles },
  { id: "TATTOO_STUDIO", name: "Tattoo", icon: PenTool },
  { id: "MAKEUP_ARTIST", name: "Makeup artist", icon: Brush },
  { id: "HOME_BEAUTY_SERVICES", name: "Home services", icon: HomeIcon },
  { id: "WELLNESS_CENTRE", name: "Wellness centre", icon: Heart },
  { id: "BEAUTY_ACADEMY", name: "Beauty academy", icon: BookOpen },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
