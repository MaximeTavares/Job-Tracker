import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const ALL_PLATFORMS = 'ALL' as const;

export function PlatformFilterSelect({
  platforms,
  value,
  onChange,
}: {
  platforms: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Plateforme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PLATFORMS}>Toutes les plateformes</SelectItem>
        {platforms.map((platform) => (
          <SelectItem key={platform} value={platform}>
            {platform}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
