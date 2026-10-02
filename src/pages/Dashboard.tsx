import * as React from 'react';
import { BarChart3, Repeat, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/pages/ListaAtiva';
import {
  AmountDisplay,
  Card,
  Chip,
  EmptyState,
  SegmentedControl,
  Select,
  StatTile,
} from '@/components/ui/primitives';
import {
  ChartEmpty,
  ChartFrame,
  MonthlyBars,
  PriceLine,
  RankedBars,
  TrendBadge,
} from '@/components/dash/charts';
import { buildDashboard, buildHistory, priceSeries } from '@/lib/history';
import { money, monthName, shortDate, timeAgo } from '@/lib/format';
import { useAllLists } from '@/store/lists';
import { useSettings } from '@/store/settings';

type Measure = 'items' | 'spent';

export function Dashboard() {
  const lists = useAllLists();
  const trackPrices = useSettings((state) => state.trackPrices);

  const data = React.useMemo(() => buildDashboard(lists), [lists]);
  const history = React.useMemo(() => buildHistory(lists), [lists]);

  const [measure, setMeasure] = React.useState<Measure>('items');
  const [productKeySelected, setProductKeySelected] = React.useState<string>('');

  const hasSpend = data.totalSpent > 0;

  const comparable = React.useMemo(
    () =>
      [...history.values()]
        .filter((entry) => entry.prices.length >= 2)
        .sort((a, b) => b.prices.length - a.prices.length || a.label.localeCompare(b.label, 'pt-BR')),
    [history],
  );

  React.useEffect(() => {
    if (!productKeySelected && comparable[0]) setProductKeySelected(comparable[0].key);
  }, [comparable, productKeySelected]);

  if (!data.totalLists) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={<BarChart3 size={22} />}
          title="Sem dados ainda"
          description="Encerre a primeira compra e os números aparecem aqui: o que você mais compra, por corredor, e como o preço mudou."
        />
      </>
    );
  }

  const monthly = data.months.map((month) => ({
    label: monthName(month.key),
    value: measure === 'items' ? month.items : month.spent,
  }));

  const selected = productKeySelected ? history.get(productKeySelected) : undefined;
  const series = selected ? priceSeries(history, selected.key) : [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${data.totalLists} ${data.totalLists === 1 ? 'compra encerrada' : 'compras encerradas'}`}
      />

      <div className="space-y-3.5 px-3.5 py-3.5">
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Itens comprados"
            value={<span className="tnum">{data.totalItemsBought}</span>}
            hint={`${data.avgItemsPerList} por compra, em média`}
          />
          {hasSpend ? (
            <StatTile
              label="Total gasto"
              value={<AmountDisplay value={data.totalSpent} size="lg" />}
              hint="só os itens com preço registrado"
            />
          ) : (
            <StatTile
              label="Produtos distintos"
              value={<span className="tnum">{data.trackedProducts}</span>}
              hint="no seu histórico"
            />
          )}
        </div>

        <ChartFrame
          title="Mês a mês"
          hint={measure === 'items' ? 'Itens comprados por mês' : 'Gasto registrado por mês'}
          action={
            hasSpend ? (
              <SegmentedControl
                ariaLabel="Medida do gráfico mensal"
                className="w-[150px]"
                value={measure}
                onChange={setMeasure}
                options={[
                  { value: 'items', label: 'Itens' },
                  { value: 'spent', label: 'Gasto' },
                ]}
              />
            ) : null
          }
        >
          {monthly.length ? (
            <MonthlyBars
              data={monthly}
              valueLabel={measure === 'items' ? 'itens' : 'gasto'}
              formatValue={(value) => (measure === 'items' ? String(value) : money(value))}
            />
          ) : (
            <ChartEmpty>Encerre uma compra para o primeiro mês aparecer.</ChartEmpty>
          )}
        </ChartFrame>

        <ChartFrame title="Onde seus itens estão" hint="Por corredor, do que mais pesa para o que menos">
          {data.aisles.length ? (
            <RankedBars
              data={data.aisles.slice(0, 8).map((aisle) => ({
                label: aisle.label,
                value: aisle.items,
                secondary: aisle.spent > 0 ? money(aisle.spent) : undefined,
              }))}
              formatValue={(value) => `${value} ${value === 1 ? 'item' : 'itens'}`}
            />
          ) : (
            <ChartEmpty>Nada por aqui ainda.</ChartEmpty>
          )}
        </ChartFrame>

        <ChartFrame
          title="Histórico de preço"
          hint={
            comparable.length
              ? 'Como o preço desse produto mudou nas suas compras'
              : 'Precisa do mesmo produto com preço em duas compras'
          }
          action={
            comparable.length > 1 ? (
              <Select
                aria-label="Produto"
                className="max-w-[170px] py-1.5 text-[13px]"
                value={productKeySelected}
                onChange={(event) => setProductKeySelected(event.target.value)}
              >
                {comparable.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            ) : null
          }
        >
          {selected && series.length >= 2 ? (
            <>
              <PriceLine
                data={series.map((observation) => ({
                  at: observation.at,
                  price: observation.price,
                  label: shortDate(observation.at),
                }))}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12.5px] text-text-muted">
                <span className="font-medium text-text">{selected.label}</span>
                <Chip tone="default">{selected.prices.length} registros</Chip>
                {(() => {
                  const first = series[0];
                  const last = series.at(-1);
                  if (!first || !last || first.price <= 0) return null;
                  const percent = ((last.price - first.price) / first.price) * 100;
                  return (
                    <>
                      <TrendBadge percent={percent} />
                      <span>
                        de {money(first.price)} para {money(last.price)}
                      </span>
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <ChartEmpty>
              {trackPrices
                ? 'Registre o preço do mesmo produto em duas compras e a linha aparece aqui.'
                : 'Ligue "Registrar preços" em Ajustes e anote o valor no mercado — aí este gráfico ganha dados.'}
            </ChartEmpty>
          )}
        </ChartFrame>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Repeat size={15} className="text-text-muted" />
            <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">O que você mais compra</h2>
          </div>
          <ul className="divide-y divide-border">
            {data.topProducts.map((product, index) => (
              <li key={product.key} className="flex items-center gap-3 px-4 py-2.5">
                <span className="tnum w-5 shrink-0 text-center text-[12px] font-semibold text-text-faint">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{product.label}</p>
                  <p className="truncate text-[11.5px] text-text-muted">
                    {product.aisle} · última {timeAgo(product.lastBoughtAt)}
                  </p>
                </div>
                {product.lastPrice !== undefined ? (
                  <AmountDisplay value={product.lastPrice} size="sm" muted />
                ) : null}
                <Chip tone="default" className="tnum shrink-0">
                  {product.timesBought}×
                </Chip>
              </li>
            ))}
          </ul>
        </Card>

        {data.biggestRises.length ? (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <TrendingUp size={15} className="text-danger" />
              <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">O que mais subiu</h2>
            </div>
            <ul className="divide-y divide-border">
              {data.biggestRises.map((product) => (
                <li key={product.key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{product.label}</p>
                    <p className="tnum truncate text-[11.5px] text-text-muted">
                      {money(product.firstPrice)} → {money(product.lastPrice)}
                    </p>
                  </div>
                  <TrendBadge percent={product.priceTrend ?? 0} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
