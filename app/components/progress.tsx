import { Progress } from '~/components/ui/progress';
import { useUploadProgress } from '~/lib/use-upload-progress';
import { cn } from '~/lib/utils';
import { UploadProgressEvent } from '~/routes/360.new.$id.imagesUpload/uploader.server';

export function UploadProgress({ id, className }: { id: string; className?: string }) {
	const progress = useUploadProgress<UploadProgressEvent>(id);

	if (!progress?.event) return null;

	return (
		<div className={cn('flex flex-row items-center gap-2', className)}>
			<p className="text-sm text-muted-foreground">
				{Number(progress.event.percentage * 100).toFixed(1)}%
			</p>
			<Progress value={progress.event?.percentage * 100} />
		</div>
	);
}
