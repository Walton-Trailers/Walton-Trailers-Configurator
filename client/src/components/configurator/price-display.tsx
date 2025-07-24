interface PriceDisplayProps {
  price: number;
}

export default function PriceDisplay({ price }: PriceDisplayProps) {
  return (
    <div className="text-right">
      <div className="text-sm text-muted-foreground">Starting at</div>
      <div className="text-2xl font-bold text-primary price-animate">
        ${price.toLocaleString()}
      </div>
    </div>
  );
}
