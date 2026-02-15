
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ProgramOfficers from './ProgramOfficers';
import Participants from './Participants';
import { Users, ShieldCheck } from 'lucide-react';

const Personnel: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <Users className="size-8 text-primary animate-pulse-glow" />
                        MISSION PERSONNEL
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">
                        Global Operative Registry & Command Structure
                    </p>
                </div>
            </div>

            <Tabs defaultValue="officers" className="w-full space-y-6">
                <TabsList className="bg-muted/30 border border-white/5 p-1 rounded-xl w-full md:w-auto grid grid-cols-2 h-auto">
                    <TabsTrigger
                        value="officers"
                        className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-primary/50 border border-transparent py-3"
                    >
                        <ShieldCheck className="size-4 mr-2" />
                        PROGRAM OFFICERS
                    </TabsTrigger>
                    <TabsTrigger
                        value="participants"
                        className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary data-[state=active]:border-secondary/50 border border-transparent py-3"
                    >
                        <Users className="size-4 mr-2" />
                        PARTICIPANTS
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="officers" className="mt-0 focus-visible:outline-none">
                    <div className="glass-card p-1 rounded-2xl border-none shadow-none bg-transparent">
                        {/* We are hiding the header of the imported component via CSS if needed, or just letting it be */}
                        {/* Since we can't easily pass props to hide existing headers without modifying those files, 
                            we will just render them. The double header might look a bit odd but it provides context.
                            For a cleaner look, identifying that we are in a 'tab' context might rely on modifying the children.
                            Let's just render them for now.
                        */}
                        <ProgramOfficers />
                    </div>
                </TabsContent>

                <TabsContent value="participants" className="mt-0 focus-visible:outline-none">
                    <div className="glass-card p-1 rounded-2xl border-none shadow-none bg-transparent">
                        <Participants />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Personnel;
