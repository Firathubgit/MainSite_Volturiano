
import 'dotenv/config';
import { supabaseAdmin } from '../web/server/lib/supabase-admin.js';

async function checkCategories() {
    try {
        const { data: categories, error } = await supabaseAdmin
            .from('component_categories')
            .select('slug, display_name');
        
        console.log('Categories in component_categories:');
        console.log(JSON.stringify(categories, null, 2));

        const { data: componentCats, error: err2 } = await supabaseAdmin
            .from('components')
            .select('category')
            .eq('status', 'active');
        
        const distinct = [...new Set(componentCats.map(c => c.category))];
        console.log('\nDistinct categories in components table:');
        console.log(distinct);
    } catch (e) {
        console.error(e);
    }
}

checkCategories();
