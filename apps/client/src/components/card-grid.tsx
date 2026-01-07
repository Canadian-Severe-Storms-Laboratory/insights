export function CardGrid<T>({
    items,
    renderCard,
    emptyState
}: {
    items: T[];
    renderCard: (item: T) => React.ReactNode;
    emptyState: React.ReactNode;
}) {
    if (items.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
                <div key={index}>{renderCard(item)}</div>
            ))}
        </div>
    );
}
