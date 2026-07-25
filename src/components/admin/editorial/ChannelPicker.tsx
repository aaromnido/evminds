import ChannelOption from "./ChannelOption";
import { CHANNELS, orderChannels } from "@/lib/editorial-channels";
import type { PublishChannel } from "@/lib/editorial-types";

interface Props {
  value: PublishChannel[];
  onChange: (channels: PublishChannel[]) => void;
  disabled?: boolean;
}

/**
 * Where this piece goes. Both destinations can be picked at once, and the choice
 * is made per topic rather than by a fixed rule — some things only fit one of
 * the two.
 *
 * It is also what decides the length of the wizard: each channel adds its own
 * screen, which is why the step indicator above grows the moment the second one
 * is ticked. Showing the consequence beats writing a sentence explaining it.
 */
export default function ChannelPicker({ value, onChange, disabled }: Props) {
  function toggle(channel: PublishChannel, checked: boolean) {
    // Ordered on the way out so the wizard steps never depend on click order.
    onChange(orderChannels(checked ? [...value, channel] : value.filter((c) => c !== channel)));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CHANNELS.map((channel) => (
        <ChannelOption
          key={channel.value}
          id={`channel-${channel.value}`}
          name={channel.name}
          description={channel.description}
          checked={value.includes(channel.value)}
          onChange={(checked) => toggle(channel.value, checked)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
