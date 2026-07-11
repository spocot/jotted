import { useState, useCallback } from "react";
import {
  useGetInquiryTablesQuery,
  useGetInquiryTableSchemaQuery,
  useGetInquiryTableForeignKeysQuery,
  useLazyGetInquiryTableRowsQuery,
  useLazyGetInquiryTableRowQuery,
} from "../store/redux/api";
import type { InquiryRow } from "../types";
import InquiryTableList from "../components/InquiryTableList";
import InquiryTableSchema from "../components/InquiryTableSchema";
import InquiryRowTable from "../components/InquiryRowTable";
import InquiryJsonPanel from "../components/InquiryJsonPanel";

const PAGE_SIZE = 50;

export default function InquiryPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const { data: tables = [], isLoading: tablesLoading } = useGetInquiryTablesQuery();
  const { data: schemaData, isLoading: schemaLoading } = useGetInquiryTableSchemaQuery(
    selectedTable ?? "",
    { skip: !selectedTable },
  );
  const { data: foreignKeys = [] } = useGetInquiryTableForeignKeysQuery(
    selectedTable ?? "",
    { skip: !selectedTable },
  );
  const [fetchRows, { isLoading: rowsLoading }] = useLazyGetInquiryTableRowsQuery();
  const [fetchRow, rowResult] = useLazyGetInquiryTableRowQuery();

  const loadRows = useCallback(
    async (table: string, sortCol: string | null, order: string, off: number) => {
      const result = await fetchRows({
        table,
        sort: sortCol ?? undefined,
        order,
        limit: PAGE_SIZE,
        offset: off,
      });
      if (result.data) {
        setRows(result.data.items);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      }
    },
    [fetchRows],
  );

  const handleSelectTable = useCallback(
    (table: string) => {
      if (table === selectedTable) return;
      setSelectedTable(table);
      setSelectedRowKey(null);
      setRows([]);
      setOffset(0);
      setSortColumn(null);
      setSortOrder("DESC");
      loadRows(table, null, "DESC", 0);
    },
    [selectedTable, loadRows],
  );

  const handleSortColumn = useCallback(
    (column: string) => {
      if (!selectedTable) return;
      let newOrder: "ASC" | "DESC" = "ASC";
      if (sortColumn === column) {
        newOrder = sortOrder === "ASC" ? "DESC" : "ASC";
      }
      setSortColumn(column);
      setSortOrder(newOrder);
      setOffset(0);
      loadRows(selectedTable, column, newOrder, 0);
    },
    [selectedTable, sortColumn, sortOrder, loadRows],
  );

  const handlePrevPage = useCallback(() => {
    if (!selectedTable || offset === 0) return;
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    loadRows(selectedTable, sortColumn, sortOrder, newOffset);
  }, [selectedTable, offset, sortColumn, sortOrder, loadRows]);

  const handleNextPage = useCallback(() => {
    if (!selectedTable || !hasMore) return;
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadRows(selectedTable, sortColumn, sortOrder, newOffset);
  }, [selectedTable, offset, hasMore, sortColumn, sortOrder, loadRows]);

  const handleRowClick = useCallback(
    async (rowKey: string) => {
      if (!selectedTable) return;
      setSelectedRowKey(rowKey);
      await fetchRow({ table: selectedTable, rowKey });
    },
    [selectedTable, fetchRow],
  );

  const handleForeignKeyClick = useCallback(
    async (refTable: string, refColumn: string, value: string) => {
      setSelectedTable(refTable);
      setRows([]);
      setOffset(0);
      setSortColumn(refColumn);
      setSortOrder("DESC");

      const rowResult = await fetchRow({ table: refTable, rowKey: value });
      if (rowResult.data) {
        setSelectedRowKey(value);
      }

      const result = await fetchRows({
        table: refTable,
        sort: refColumn,
        order: "ASC",
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (result.data) {
        setRows(result.data.items);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      }
    },
    [fetchRows, fetchRow],
  );

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Tables
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <InquiryTableList
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
            isLoading={tablesLoading}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedTable && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">Database Explorer</p>
              <p className="text-sm">Select a table from the sidebar to browse its data.</p>
            </div>
          </div>
        )}

        {selectedTable && (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {selectedTable}
            </h2>

            <InquiryTableSchema columns={schemaData ?? []} isLoading={schemaLoading} />

            <InquiryRowTable
              rows={rows}
              columns={schemaData ?? []}
              foreignKeys={foreignKeys}
              total={total}
              offset={offset}
              limit={PAGE_SIZE}
              hasMore={hasMore}
              isLoading={rowsLoading}
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSortColumn={handleSortColumn}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onRowClick={handleRowClick}
              onForeignKeyClick={handleForeignKeyClick}
              selectedRowKey={selectedRowKey}
            />
          </>
        )}
      </div>

      {selectedRowKey && (
        <InquiryJsonPanel
          row={rowResult.data ?? null}
          isLoading={rowResult.isLoading}
          onClose={() => setSelectedRowKey(null)}
        />
      )}
    </div>
  );
}
