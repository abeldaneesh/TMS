import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ProgramOfficers from './ProgramOfficers';
import Participants from './Participants';
import { Users } from 'lucide-react';

const Personnel: React.FC = () => {
    return (
        <div className="pb-12 space-y-6 text-foreground">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Users className="size-8 sm:size-10 text-primary" />
                        Personnel Management
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Manage platform users, roles, and access controls
                    </p>
                </div>
            </div>

            <Tabs defaultValue="officers" className="w-full space-y-6">
                <TabsList className="bg-transparent border-b border-border w-full flex justify-start rounded-none h-auto p-0 gap-6">
                    <TabsTrigger
                        value="officers"
                        className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground bg-transparent border-b-2 border-transparent text-muted-foreground rounded-none py-3 px-1 font-semibold text-base transition-colors"
                    >
                        Program Officers
                    </TabsTrigger>
                    <TabsTrigger
                        value="participants"
                        className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground bg-transparent border-b-2 border-transparent text-muted-foreground rounded-none py-3 px-1 font-semibold text-base transition-colors"
                    >
                        Participants
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="officers" className="mt-6 focus-visible:outline-none">
                    <ProgramOfficers />
                </TabsContent>

                <TabsContent value="participants" className="mt-6 focus-visible:outline-none">
                    <Participants />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Personnel;
