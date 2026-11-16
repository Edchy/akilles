import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { colors } from "@/constants/theme";
import { EQUIPMENT_FILTERS } from "@/lib/find-exercise";

type Option = readonly [string, string];
const categories: Option[] = [["", "All movements"], ["push", "Push"], ["pull", "Pull"], ["legs", "Legs"], ["core", "Core"]];

export function ExerciseFilters({ category, equipment: gear, onCategory, onEquipment }: {
  category: string;
  equipment: string;
  onCategory: (value: string) => void;
  onEquipment: (value: string) => void;
}) {
  return <View style={{ gap: 4 }}>
    <FilterRow options={categories} value={category} onChange={onCategory} />
    <EquipmentFilters value={gear} onChange={onEquipment} />
  </View>;
}

export function EquipmentFilters({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <FilterRow options={EQUIPMENT_FILTERS} value={value} onChange={onChange} />;
}

function FilterRow({ options, value, onChange }: { options: Option[]; value: string; onChange: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
    {options.map(([id, label]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: value === id }} onPress={() => onChange(id)} style={{ minHeight: 44, paddingHorizontal: 13, justifyContent: "center", borderRadius: 22, backgroundColor: value === id ? colors.text : colors.surface }}>
      <Text ui style={{ fontSize: 15, color: value === id ? colors.bg : colors.text }}>{label}</Text>
    </Pressable>)}
  </ScrollView>;
}
