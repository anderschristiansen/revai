"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  initialColumnVisibility?: VisibilityState
  initialSorting?: SortingState
  pageSize?: number
  pageSizeOptions?: number[]
  getRowClassName?: (row: TData) => string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Filter...",
  initialColumnVisibility = {},
  initialSorting = [],
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
  const [showAll, setShowAll] = React.useState(false)
  
  // Track pagination state
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

  // Update page size when 'show all' changes
  React.useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageSize: showAll ? data.length : prev.pageSize,
    }))
  }, [showAll, data.length])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  return (
    <div className="space-y-4">
      {filterColumn && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumn)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Settings className="h-4 w-4 mr-2" /> Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuItem
                      key={column.id}
                      className="capitalize"
                      onClick={(e) => {
                        e.preventDefault();
                        column.toggleVisibility(!column.getIsVisible());
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={() => column.toggleVisibility(!column.getIsVisible())}
                          onClick={(e) => e.stopPropagation()}
                          className="mr-1"
                        />
                        {column.id}
                      </div>
                    </DropdownMenuItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={getRowClassName ? getRowClassName(row.original as TData) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {table.getPreFilteredRowModel().rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
                      <p>No data available</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
                      <p>No results match your search</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          table.resetColumnFilters()
                        }}
                      >
                        Reset filters
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={showAll ? "all" : `${pagination.pageSize}`}
            onValueChange={(value) => {
              if (value === "all") {
                setShowAll(true)
                setPagination({
                  pageIndex: 0, // Go back to first page when showing all
                  pageSize: data.length
                })
              } else {
                setShowAll(false)
                setPagination({
                  pageIndex: 0, // Go back to first page when changing page size
                  pageSize: Number(value)
                })
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 text-sm text-muted-foreground text-center md:text-left">
          {table.getFilteredRowModel().rows.length === 0 ? (
            <span>No results</span>
          ) : (
            <span>
              Showing {pagination.pageIndex * pagination.pageSize + 1}-
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of {table.getFilteredRowModel().rows.length}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
            disabled={!table.getCanPreviousPage()}
            title="First page"
          >
            <span className="sr-only">First page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
            disabled={!table.getCanPreviousPage()}
            className="h-8 px-2.5"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          
          <div className="hidden md:flex items-center gap-1 px-1">
            {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
              // Show pages around current page
              const pageCount = table.getPageCount()
              const currentPage = pagination.pageIndex
              let pageIndex: number
              
              if (pageCount <= 5) {
                // If 5 or fewer pages, show all
                pageIndex = i
              } else if (currentPage < 2) {
                // Near start
                pageIndex = i
              } else if (currentPage > pageCount - 3) {
                // Near end
                pageIndex = pageCount - 5 + i
              } else {
                // Middle - show current page and neighbors
                pageIndex = currentPage - 2 + i
              }
              
              if (pageIndex >= 0 && pageIndex < pageCount) {
                return (
                  <Button
                    key={pageIndex}
                    variant={pageIndex === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPagination(prev => ({ ...prev, pageIndex }))}
                  >
                    {pageIndex + 1}
                  </Button>
                )
              }
              return null
            })}
          </div>
          
          <div className="flex md:hidden items-center gap-1">
            <span className="text-sm font-medium">Page {pagination.pageIndex + 1}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            disabled={!table.getCanNextPage()}
            className="h-8 px-2.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: table.getPageCount() - 1 }))}
            disabled={!table.getCanNextPage()}
            title="Last page"
          >
            <span className="sr-only">Last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
          
          <div className="hidden md:flex items-center gap-1 ml-2">
            <Input
              type="number"
              min={1}
              max={table.getPageCount()}
              value={pagination.pageIndex + 1}
              onChange={(e) => {
                const value = e.target.value;
                const page = value ? Number(value) - 1 : 0;
                
                if (!isNaN(page) && page >= 0 && page < table.getPageCount()) {
                  setPagination(prev => ({
                    ...prev,
                    pageIndex: page
                  }));
                }
              }}
              onBlur={() => {
                // Ensure the input displays a valid value on blur
                const page = pagination.pageIndex;
                if (page < 0) {
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                } else if (page >= table.getPageCount()) {
                  setPagination(prev => ({ ...prev, pageIndex: Math.max(0, table.getPageCount() - 1) }));
                }
              }}
              className="h-8 w-16"
            />
            <span className="text-sm whitespace-nowrap">of {table.getPageCount()}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 