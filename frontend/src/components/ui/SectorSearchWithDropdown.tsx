
import * as React from "react"
import { Check, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog"
import { Label } from "./label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { API_BASE_URL } from "@/lib/api"

export interface SectorData {
    id: number | string
    name: string
    children: string[]
}

export interface SelectedItem {
    label: string
    sector: string
    sectorId: string
    value: string
}

interface Props {
    data: SectorData[]
    onSelect?: (item: SelectedItem) => void
    placeholder?: string
    showAllOption?: boolean
    onDataAdded?: () => void,
    defaultValue?: { sector: string; techArea: string };
}

export default function SectorSearchWithDropdown({
    data,
    onSelect,
    placeholder = "Search technology or sector…",
    onDataAdded,
    defaultValue

}: Props) {
    const [search, setSearch] = React.useState("")
    const [open, setOpen] = React.useState(false)
    const [sectorFilter, setSectorFilter] = React.useState<string>("")
    const [selected, setSelected] = React.useState<SelectedItem | null>(null)

    const flattened: SelectedItem[] = React.useMemo(
        () =>
            (Array.isArray(data) ? data : []).flatMap((s) =>
                s.children.map((tech) => ({
                    label: tech,
                    sector: s.name,
                    sectorId: String(s.id),
                    value: `${s.name} -> ${tech}`,
                }))
            ),
        [data]
    )

    React.useEffect(() => {
        if (defaultValue && defaultValue.sector && defaultValue.techArea && flattened.length > 0) {
            const foundItem = flattened.find(
                item => item.sector === defaultValue.sector && item.label === defaultValue.techArea
            );
            if (foundItem) {
                setSelected(foundItem);
            } else {
                setSelected(null);
            }
        } else {
            setSelected(null);
        }
    }, [defaultValue, flattened]);

    React.useEffect(() => {
        if (data.length > 0 && !sectorFilter) {
            setSectorFilter(String(data[0].id));
        }
    }, [data, sectorFilter]);

    const filtered: SelectedItem[] = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        return flattened.filter((item) => {
            const matchesSector =
                item.sectorId === sectorFilter
            if (!matchesSector) return false
            if (!q) return true
            return (
                item.label.toLowerCase().includes(q) ||
                item.sector.toLowerCase().includes(q)
            )
        })
    }, [flattened, search, sectorFilter])


    const sectorBtnLabel =
        (Array.isArray(data) ? data.find((s) => String(s.id) === sectorFilter)?.name : undefined) ?? "Select Sector"


    const handleChoose = (item: SelectedItem) => {
        setSelected(item)
        onSelect?.(item)
    }

    const [sector, setSector] = useState("");
    const [technologyArea, setTechnologyArea] = useState("");
    const [confirmValue, setConfirmValue] = useState("");

    const handleSave = async () => {
        if (confirmValue.toLowerCase() === "confirm") {
            const token = localStorage.getItem("token")
            try {
                const response = await fetch(`${API_BASE_URL}/api/sectors/add`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sector,
                        technologyArea,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to save data.");
                }

                const result = await response.json();

                toast({
                    title: "Success!",
                    description: "Sector and Technology Area were saved successfully.",
                });

                onDataAdded?.();

                const newItem: SelectedItem = {
                    label: technologyArea,
                    sector,
                    sectorId: result.id?.toString() ?? sector,
                    value: `${sector} -> ${technologyArea}`,
                };

                setSelected(newItem);
                onSelect?.(newItem);

                setOpen(false);
                setSector("");
                setTechnologyArea("");
                setConfirmValue("");

            } catch (error) {
                toast({
                    title: "Error",
                    description: "Something went wrong while saving. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };


    const isSaveDisabled = !sector || !technologyArea;
    const isConfirmDisabled = confirmValue.toLowerCase() !== "confirm";

    return (
        <div className="w-full space-y-2">

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={placeholder}
                        className="pl-8"
                    />
                </div>

                <Select value={sectorFilter} onValueChange={(value) => {
                    setSectorFilter(value);
                    setSelected(null);
                }}>
                    <SelectTrigger className="w-2/5 justify-between">
                        <SelectValue placeholder="Select Sector" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup className="max-h-[220px]">
                            {(Array.isArray(data) ? data : []).map((s) => {
                                const sid = String(s.id);
                                return (
                                    <SelectItem key={sid} value={sid}>
                                        <span className="block max-w-[40px] md:max-w-full truncate">{s.name}</span>
                                    </SelectItem>
                                );
                            })}
                        </SelectGroup>
                    </SelectContent>
                </Select>

            </div>

            <div className="rounded-md border flex-1">
                <Command shouldFilter={false}>
                    <CommandList className="max-h-[220px] overflow-auto">
                        {filtered.length === 0 ? (
                            <CommandEmpty>No results found.</CommandEmpty>
                        ) : (
                            <CommandGroup >
                                {filtered.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        onSelect={() => handleChoose(item)}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="w-[280px] truncate md:w-full">
                                            <span className="text-muted-foreground">{item.sector}</span>
                                            {"  →  "}
                                            <span className="font-medium">{item.label}</span>
                                        </div>
                                        {selected?.value === item.value && (
                                            <Check className="h-4 w-4" />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </div>
            <div>
                {selected && <p>Selected Sector : {selected.value}</p>}
            </div>

            {!selected && <div>
                <p>
                    If the sector and technology area is not there {" "}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Add New</Button>
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Sector and Technology Area</DialogTitle>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid  items-center gap-4">
                                    <Label htmlFor="sector">Sector</Label>
                                    <Input
                                        id="sector"
                                        value={sector}
                                        onChange={(e) => setSector(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>

                                <div className="grid items-center gap-4">
                                    <Label htmlFor="techArea">Technology Area</Label>
                                    <Input
                                        id="techArea"
                                        value={technologyArea}
                                        onChange={(e) => setTechnologyArea(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button disabled={isSaveDisabled}>Save</Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Please confirm the details below and type <strong>confirm</strong> to proceed.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <div className="text-sm">
                                            <div>
                                                <strong>Sector:</strong> {sector || <em className="text-muted-foreground">Not entered</em>}
                                            </div>
                                            <div>
                                                <strong>Technology Area:</strong> {technologyArea || <em className="text-muted-foreground">Not entered</em>}
                                            </div>
                                        </div>


                                        <Input
                                            placeholder="Type confirm"
                                            value={confirmValue}
                                            onChange={(e) => setConfirmValue(e.target.value)}
                                            className="my-4"
                                        />

                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction disabled={isConfirmDisabled} onClick={handleSave}>
                                                Confirm Save
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </p>
            </div>}
        </div>
    )
}
