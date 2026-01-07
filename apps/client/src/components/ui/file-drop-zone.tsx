import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    CheckCircle2,
    FileIcon,
    RefreshCwIcon,
    UploadIcon,
    XIcon
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

export interface FileState {
    progress?: number; // 0 to 100
    error?: string;
}

export interface FileDropZoneProps {
    files: File[];
    setFiles: (files: File[]) => void;
    fileStates?: Record<string, FileState>;
    acceptedFileTypes?: string[];
    className?: string;
    disabled?: boolean;
    onReset?: () => void;
    multiple?: boolean;
}

export function FileDropZone({
    files,
    setFiles,
    fileStates = {},
    acceptedFileTypes = [],
    className,
    disabled = false,
    onReset,
    multiple = true
}: FileDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const acceptedFileTypesString = acceptedFileTypes.join(',');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(
        (selectedFiles: FileList | null) => {
            if (!selectedFiles || disabled) return;

            const newFiles = Array.from(selectedFiles);
            const validFiles = acceptedFileTypes.length
                ? newFiles.filter((file) =>
                      acceptedFileTypes.some(
                          (type) =>
                              file.type.includes(type.replace('*', '')) ||
                              file.name.endsWith(type.replace('*', ''))
                      )
                  )
                : newFiles;

            const existingFileNames = new Set(files.map((f) => f.name));
            const uniqueFiles = validFiles.filter((file) => !existingFileNames.has(file.name));

            setFiles(uniqueFiles);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [acceptedFileTypes, disabled, files, setFiles]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled) {
                handleFileChange(e.dataTransfer.files);
            }
        },
        [handleFileChange, disabled]
    );

    const openFileDialog = () => {
        if (fileInputRef.current && !disabled) {
            fileInputRef.current.click();
        }
    };

    const removeFile = (index: number) => {
        if (disabled) return;
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    return (
        <Card className={cn('w-full', className)}>
            <CardContent className="p-6">
                <div
                    className={cn(
                        'relative rounded-lg border-2 border-dashed p-6 transition-colors',
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                        !disabled && 'hover:border-primary/50 cursor-pointer',
                        disabled && 'cursor-not-allowed opacity-60',
                        files.length > 0 ? 'pb-2' : ''
                    )}
                    onDragOver={disabled ? undefined : handleDragOver}
                    onDragLeave={disabled ? undefined : handleDragLeave}
                    onDrop={disabled ? undefined : handleDrop}
                    onClick={openFileDialog}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                        accept={acceptedFileTypesString}
                        multiple={multiple}
                        disabled={disabled}
                    />

                    <div className="flex flex-col items-center justify-center gap-1 text-center">
                        <UploadIcon className="text-muted-foreground/50 h-10 w-10" />
                        <p className="text-sm font-medium">
                            Drag & drop files here, or click to select
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {acceptedFileTypes.length > 0
                                ? `Accepts: ${acceptedFileTypes.join(', ')}`
                                : 'All file types supported'}
                        </p>

                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            disabled={disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                openFileDialog();
                            }}
                        >
                            Select files
                        </Button>
                    </div>

                    {files.length > 0 && (
                        <div className="border-muted-foreground/10 bg-muted/50 my-4 max-h-[400px] space-y-2 overflow-y-auto rounded-md border p-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground absolute top-2 right-2 h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFiles([]);
                                    if (onReset) onReset();
                                }}
                            >
                                <RefreshCwIcon className="h-4 w-4" />
                            </Button>
                            {files.map((file, index) => {
                                const fileState = fileStates[file.name] || {};
                                const { progress, error } = fileState;

                                const hasError = !!error;
                                const isUploading = typeof progress === 'number';
                                const isComplete = progress === 100;

                                return (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className={cn(
                                            'relative flex flex-col gap-2 rounded-md border p-3',
                                            hasError
                                                ? 'border-destructive/50 bg-destructive/10'
                                                : 'border-border bg-background'
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                        tabIndex={0}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileIcon
                                                className={cn(
                                                    'h-4 w-4',
                                                    hasError
                                                        ? 'text-destructive'
                                                        : 'text-muted-foreground'
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    'flex-1 truncate text-sm font-medium',
                                                    hasError && 'text-destructive'
                                                )}
                                            >
                                                {file.name}
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {formatBytes(file.size)}
                                            </span>

                                            {/* Allow remove if not uploading, complete, or if error exists */}
                                            {(!isUploading || !isComplete || hasError) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        '-mr-1 h-6 w-6',
                                                        hasError &&
                                                            'text-destructive hover:bg-destructive/20 hover:text-destructive'
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(index);
                                                    }}
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Error Message */}
                                        {hasError && (
                                            <div className="text-destructive flex items-center gap-2 text-xs">
                                                <AlertCircle className="h-3 w-3" />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        {/* Progress Bar (only if no error) */}
                                        {isUploading && !hasError && (
                                            <div className="flex items-center gap-2">
                                                <Progress value={progress} className="h-2 flex-1" />
                                                <span className="text-muted-foreground w-10 text-right text-xs">
                                                    {progress}%
                                                </span>
                                                {isComplete && (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
