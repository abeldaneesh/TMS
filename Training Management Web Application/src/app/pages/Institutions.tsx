
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Institution } from '../../types';
import { institutionsApi } from '../../services/api';
import { Building2, MapPin, Activity, ShieldCheck } from 'lucide-react';

const Institutions: React.FC = () => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInstitutions = async () => {
            try {
                const data = await institutionsApi.getAll();
                setInstitutions(data);
            } catch (error) {
                console.error('Failed to fetch institutions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInstitutions();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <Building2 className="size-8 text-primary animate-pulse-glow" />
                        INSTITUTIONS
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Sector Registry & Organizational Matrix</p>
                </div>
            </div>

            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                    <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
                        <ShieldCheck className="size-4" />
                        VERIFIED SECTORS
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative size-12 mb-4">
                                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
                            </div>
                            <p className="text-primary font-mono text-xs tracking-widest animate-pulse">ACCESSING SECTOR DATABASE...</p>
                        </div>
                    ) : institutions.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                            <Activity className="size-12 mx-auto mb-4 text-primary/20 animate-pulse" />
                            <h3 className="text-xl font-bold text-foreground tracking-widest uppercase">No Sectors Detected</h3>
                            <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase tracking-widest">The institutional grid is currently offline.</p>
                        </div>
                    ) : (
                        <Table className="neon-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/10">
                                    <TableHead>SECTOR / NAME</TableHead>
                                    <TableHead>CLASSIFICATION</TableHead>
                                    <TableHead>COORDINATES / LOCATION</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {institutions.map((institution) => (
                                    <TableRow key={institution.id} className="group border-primary/5">
                                        <TableCell className="py-4 font-bold text-foreground tracking-wide">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                                    <Building2 className="size-4" />
                                                </div>
                                                {institution.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/5 font-mono text-[10px] tracking-widest uppercase px-3">
                                                {institution.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground font-mono text-xs flex items-center gap-2">
                                            <MapPin className="size-3 text-primary/50" />
                                            {institution.location}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Institutions;
