import { AuroraField } from '@shared/glass';
import { useService } from '@shared/kernel';
import { createTemplateService } from '../service';

export default function TemplateScreen() {
  const service = useService(createTemplateService);
  return <AuroraField drift={service.journalSize() > 0} style={{ flex: 1 }} />;
}
