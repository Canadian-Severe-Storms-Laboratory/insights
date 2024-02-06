import { DialogContentHeader } from '../header';
import {
	AlertDialogCancel,
	AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DialogContentProps } from './types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SubmitHandler, useForm } from 'react-hook-form';
import { api } from '@/utils/api';

type Inputs = {
	name: string;
};

export const ConfigureDialogContent = (props: DialogContentProps) => {
	const setScanData = api.scans.setScanData.useMutation();
	const [processing, setProcessing] = useState(false);
	const toaster = useToast();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Inputs>();

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void (async () => {
			await handleSubmit((async (data) => {
				setProcessing(true);

				try {
					const response = await setScanData.mutateAsync({
						id: props.formState.scan_id,
						data: {
							name: data.name,
						},
					});

					if (response) {
						toaster.toast({
							title: 'Scan created',
							description: 'Scan has been created successfully.',
							duration: 5000,
						});

						reset();
						props.onNext?.(props.formState);
					}
				} catch (error) {
					toaster.toast({
						title: 'Error',
						description:
							'An error occurred while configuring the scan. Please try again.',
						duration: 5000,
					});

					reset();
				}

				setProcessing(false);
			}) as SubmitHandler<Inputs>)(event);
		})();
	};

	return (
		<form className="grid w-full gap-4" onSubmit={onSubmit}>
			<div className="flex flex-col">
				<Label htmlFor="name" className="pb-2">
					Hailpad Scan Name
				</Label>
				<Input
					id="name"
					placeholder="Name here..."
					{...register('name', {
						required: true,
						disabled: processing,
					})}
				/>
				{errors.name && (
					<p className="pt-1 text-xs text-red-500">Scan name is required.</p>
				)}
				{!errors.name && (
					<p className="text-muted-foreground pt-1 text-xs">
						Enter a name for this scan.
					</p>
				)}
			</div>
			<div className="flex flex-row gap-4">
			</div>
			<AlertDialogFooter className="flex-col items-center pt-2 sm:space-y-2 md:flex-row md:justify-between">
				<DialogContentHeader
					index={2}
					title="Configure the scan"
					description="Name the scan and change default values the end user will see."
				/>
				<div className="flex w-full flex-row items-center justify-end space-x-2 md:w-auto">
					<AlertDialogCancel
						onClick={() => {
							reset();
							props.onCancel?.();
						}}
						disabled={processing}
					>
						Cancel
					</AlertDialogCancel>
					<Button type="submit" className="mt-2 sm:mt-0" disabled={processing}>
						{processing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
						{processing ? 'Please wait' : 'Done'}
					</Button>
				</div>
			</AlertDialogFooter>
		</form>
	);
};
