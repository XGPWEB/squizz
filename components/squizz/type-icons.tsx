import {
  Columns2,
  Gauge,
  Heading1,
  Image,
  LayoutGrid,
  Lightbulb,
  List,
  MapPin,
  MapPinned,
  MessageSquareText,
  PieChart,
  Presentation,
  Puzzle,
  Quote,
  SlidersHorizontal,
  Cloud,
  TextCursorInput,
  ToggleLeft,
  Ellipsis,
  type LucideIcon,
} from "lucide-react";
import type { QuestionType, SlideLayout } from "@/lib/question";

export const typeIcons: Record<QuestionType, LucideIcon> = {
  quiz: LayoutGrid,
  truefalse: ToggleLeft,
  text: TextCursorInput,
  slider: SlidersHorizontal,
  pin: MapPin,
  puzzle: Puzzle,
  poll: PieChart,
  scale: Ellipsis,
  nps: Gauge,
  pinpoll: MapPinned,
  wordcloud: Cloud,
  open: MessageSquareText,
  brainstorm: Lightbulb,
  slide: Presentation,
};

export const layoutIcons: Record<SlideLayout, LucideIcon> = {
  classic: Presentation,
  title: Heading1,
  titletext: Columns2,
  bullets: List,
  quote: Quote,
  bigimage: Image,
};
